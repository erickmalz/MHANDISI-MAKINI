import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { availableFloat, labourVariance, materialVariance } from "@/lib/finance";
import {
  COMPLETABLE_PROJECT_STATUSES,
  TERMINAL_STAGE_STATUSES,
  projectCloseoutBlockers,
  type ProjectCloseoutGates,
  type ProjectCloseoutOpenStageRef,
} from "@/lib/project-closeout";
import type { StageFinancials } from "@/lib/types";

import { getCurrentAccountId } from "./account-context";
import { claimDocumentNumber, pad3 } from "./document-numbers";
import { computeStageFinancials } from "./projection";
import { projectCloseouts, projects, stages } from "./schema";
import type {
  DocumentSnapshotLine,
  DocumentSnapshotSection,
  ProjectCloseoutReportSnapshot,
} from "./schema/snapshot";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Project Closeout DAL (Phase 4 ticket 04) — mirrors
 * `src/lib/data/stage-closeout.ts`'s shape one level up: the read side
 * re-derives the same one hard gate `completeProject` enforces, so the
 * checklist screen and the transaction can never disagree; the write side is
 * the atomic `Complete Project` transaction (which also freezes the
 * `project_closeout_report` snapshot) plus the much smaller `Archive
 * Project` status flip.
 *
 * No `accountId` in any signature except where a write needs it for an
 * insert — `withAccount` sets the tenant GUC and Postgres RLS is the
 * backstop, same posture as every other DAL file here.
 */

export type { ProjectCloseoutGates };

/**
 * Re-derive the project's one checklist gate from the live rows, inside a
 * caller's own transaction — internal, `tx`-scoped, same posture as
 * `stage-closeout.ts`'s `loadCloseoutGates`: `completeProject` calls this
 * directly so its own re-check runs on the same transaction as its status
 * write, rather than nesting a second `withAccount` transaction inside the
 * first. Returns `null` for a missing / cross-account project.
 */
async function loadCloseoutGates(
  tx: AccountTx,
  projectId: string,
): Promise<ProjectCloseoutGates | null> {
  const [project] = await tx
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;

  const stageRows = await tx
    .select({ id: stages.id, seq: stages.seq, name: stages.name, status: stages.status })
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .orderBy(asc(stages.seq));

  const openStages: ProjectCloseoutOpenStageRef[] = stageRows
    .filter((s) => !TERMINAL_STAGE_STATUSES.has(s.status))
    .map((s) => ({ id: s.id, seq: s.seq, name: s.name, status: s.status }));

  return { hasStages: stageRows.length > 0, openStages };
}

/**
 * Re-derive the project's one checklist gate from the live rows — the same
 * shape `completeProject` re-checks server-side. Returns `null` for a
 * missing / cross-account project. This is what the Project Closeout screen
 * reads.
 */
export async function getProjectCloseoutGates(
  projectId: string,
): Promise<ProjectCloseoutGates | null> {
  return withAccount((tx) => loadCloseoutGates(tx, projectId));
}

/**
 * Elementwise sum of every stage's already-computed `StageFinancials`
 * (ticket 04's Answer: "assembled by summing the already-computed per-stage
 * figures ... rather than a new project-wide financial calculation engine").
 * The result is itself a valid `StageFinancials`, so `@/lib/finance`'s
 * `availableFloat`/`materialVariance`/`labourVariance` apply to it directly
 * — "one authoritative calculation path" (guidelines §51), reused rather
 * than re-derived at project scope.
 */
function sumFinancials(list: StageFinancials[]): StageFinancials {
  const zero: StageFinancials = {
    clientDeposits: 0,
    openPurchaseCommitments: 0,
    paidPurchases: 0,
    openLabourCommitments: 0,
    labourPayments: 0,
    labourAgreementTotal: 0,
    materialEstimated: 0,
    pettyCashExpenses: 0,
    otherApprovedCommitments: 0,
    remainingMaterial: 0,
    remainingLabour: 0,
    remainingFee: 0,
    remainingOtherApproved: 0,
    feeInvoiced: 0,
    feeReceived: 0,
    fundingRequestPending: false,
  };
  return list.reduce(
    (acc, f) => ({
      clientDeposits: acc.clientDeposits + f.clientDeposits,
      openPurchaseCommitments: acc.openPurchaseCommitments + f.openPurchaseCommitments,
      paidPurchases: acc.paidPurchases + f.paidPurchases,
      openLabourCommitments: acc.openLabourCommitments + f.openLabourCommitments,
      labourPayments: acc.labourPayments + f.labourPayments,
      labourAgreementTotal: acc.labourAgreementTotal + f.labourAgreementTotal,
      materialEstimated: acc.materialEstimated + f.materialEstimated,
      pettyCashExpenses: acc.pettyCashExpenses + f.pettyCashExpenses,
      otherApprovedCommitments: acc.otherApprovedCommitments + f.otherApprovedCommitments,
      remainingMaterial: acc.remainingMaterial + f.remainingMaterial,
      remainingLabour: acc.remainingLabour + f.remainingLabour,
      remainingFee: acc.remainingFee + f.remainingFee,
      remainingOtherApproved: acc.remainingOtherApproved + f.remainingOtherApproved,
      feeInvoiced: acc.feeInvoiced + f.feeInvoiced,
      feeReceived: acc.feeReceived + f.feeReceived,
      fundingRequestPending: acc.fundingRequestPending || f.fundingRequestPending,
    }),
    zero,
  );
}

/**
 * Every Supplier with at least one non-cancelled Purchase Order on this
 * project, and its balance scoped to *this project's* orders only —
 * `max(0, ordered total − paid)` per order, floored then summed, exactly
 * `src/lib/data/statements.ts`'s `getSupplierStatement` formula. Not a call
 * to that function directly: `statements.ts`'s exports are deliberately
 * account-wide, all-time (Operational Control decision 5 — a Statement is a
 * per-register-entry view, not a per-project one), so a project-scoped
 * figure needs its own query using the same formula rather than filtering an
 * account-wide read down after the fact.
 */
async function getProjectSupplierBalances(
  tx: AccountTx,
  projectId: string,
): Promise<{ name: string; balance: number }[]> {
  const rows = (
    await tx.execute<{ name: string; balance: string }>(sql`
      SELECT sup.name,
        COALESCE(SUM(GREATEST(0, po.ordered_total - po.paid_total)), 0) AS balance
      FROM (
        SELECT o.id, o.supplier_id,
          COALESCE((SELECT SUM(l.qty_ordered * l.unit_price) FROM purchase_order_lines l
                     WHERE l.purchase_order_id = o.id), 0) AS ordered_total,
          COALESCE((SELECT SUM(p.amount) FROM payment_records p
                     WHERE p.purchase_order_id = o.id AND p.voided_at IS NULL), 0) AS paid_total
        FROM purchase_orders o
        JOIN stages s ON s.id = o.stage_id
        WHERE s.project_id = ${projectId} AND o.status != 'cancelled'
      ) po
      JOIN suppliers sup ON sup.id = po.supplier_id
      GROUP BY sup.id, sup.name
      ORDER BY sup.name
    `)
  ).rows;
  return rows.map((r) => ({ name: r.name, balance: Number(r.balance) }));
}

/** The Subcontractor counterpart of `getProjectSupplierBalances`, same formula/reasoning. */
async function getProjectSubcontractorBalances(
  tx: AccountTx,
  projectId: string,
): Promise<{ name: string; balance: number }[]> {
  const rows = (
    await tx.execute<{ name: string; balance: string }>(sql`
      SELECT sub.name,
        COALESCE(SUM(GREATEST(0, t.agreed_amount - t.paid_total)), 0) AS balance
      FROM (
        SELECT tk.id, tk.subcontractor_id,
          COALESCE(tk.labour_revised, tk.labour_original, 0) AS agreed_amount,
          COALESCE((SELECT SUM(lp.amount) FROM labour_payments lp
                     WHERE lp.task_id = tk.id AND lp.voided_at IS NULL), 0) AS paid_total
        FROM tasks tk
        JOIN stages s ON s.id = tk.stage_id
        WHERE s.project_id = ${projectId}
          AND tk.subcontractor_id IS NOT NULL
          AND tk.status != 'cancelled'
      ) t
      JOIN subcontractors sub ON sub.id = t.subcontractor_id
      GROUP BY sub.id, sub.name
      ORDER BY sub.name
    `)
  ).rows;
  return rows.map((r) => ({ name: r.name, balance: Number(r.balance) }));
}

/**
 * Approved Variations across every stage of the project — guidelines §37
 * "Approved variations". Each line's amount is `materialImpact +
 * labourImpact` (signed — a Variation can reduce scope as well as add);
 * `feeImpact` is a carried note only (`schema/variations.ts`), not part of
 * the summed amount, so it rides in the line's `description` when present.
 */
async function getApprovedVariationLines(
  tx: AccountTx,
  projectId: string,
): Promise<DocumentSnapshotLine[]> {
  const rows = (
    await tx.execute<{
      display_number: string | null;
      description: string;
      material_impact: string | null;
      labour_impact: string | null;
      fee_impact: string | null;
    }>(sql`
      SELECT v.display_number, v.description, v.material_impact, v.labour_impact, v.fee_impact
      FROM variations v
      JOIN stages s ON s.id = v.stage_id
      WHERE s.project_id = ${projectId} AND v.status = 'approved'
      ORDER BY v.requested_at ASC
    `)
  ).rows;
  return rows.map((r) => {
    const feeImpact = r.fee_impact != null ? Number(r.fee_impact) : 0;
    return {
      label: r.display_number ?? "Variation",
      description: feeImpact !== 0 ? `${r.description} (fee note: TZS ${feeImpact.toLocaleString("en-US")})` : r.description,
      amount: Number(r.material_impact ?? 0) + Number(r.labour_impact ?? 0),
    };
  });
}

/**
 * "Outstanding documents" (guidelines §37): any unresolved Funding
 * Request / Purchase Order / Variation across the whole project at Complete
 * time. Ticket 04's Answer: since Complete requires every stage `completed`
 * (or `cancelled`) and Stage Closeout's own four gates already forbid an
 * open Task / non-terminal Variation / `ordered` PO / open Labour
 * Commitment *per stage*, this is almost always empty by construction — the
 * Purchase Order and Variation queries here are a defensive cross-check, not
 * expected to ever fire. The genuine "rare cross-stage straggler" the ticket
 * names is an **Issued Funding Request Stage Closeout's own gates never
 * check** — `closeStage` has no Funding Request precondition — so a stage
 * can reach `completed` with its Funding Request still `issued` (not yet
 * `closed`).
 */
async function getOutstandingDocumentLines(
  tx: AccountTx,
  projectId: string,
): Promise<DocumentSnapshotLine[]> {
  const frRows = (
    await tx.execute<{ display_number: string | null; total: string | null }>(sql`
      SELECT fr.display_number, (fr.document_snapshot->>'total')::numeric AS total
      FROM funding_requests fr
      JOIN stages s ON s.id = fr.stage_id
      WHERE s.project_id = ${projectId} AND fr.status = 'issued'
    `)
  ).rows;
  const poRows = (
    await tx.execute<{ display_number: string | null; total: string | null }>(sql`
      SELECT po.display_number, (po.document_snapshot->>'total')::numeric AS total
      FROM purchase_orders po
      JOIN stages s ON s.id = po.stage_id
      WHERE s.project_id = ${projectId} AND po.status = 'ordered'
    `)
  ).rows;
  const voRows = (
    await tx.execute<{
      display_number: string | null;
      material_impact: string | null;
      labour_impact: string | null;
      status: string;
    }>(sql`
      SELECT v.display_number, v.material_impact, v.labour_impact, v.status
      FROM variations v
      JOIN stages s ON s.id = v.stage_id
      WHERE s.project_id = ${projectId} AND v.status IN ('draft', 'approved')
    `)
  ).rows;

  const lines: DocumentSnapshotLine[] = [];
  for (const r of frRows) {
    lines.push({
      label: r.display_number ?? "Funding request",
      description: "Issued, not yet closed",
      amount: Number(r.total ?? 0),
    });
  }
  for (const r of poRows) {
    lines.push({
      label: r.display_number ?? "Purchase order",
      description: "Still ordered, not closed/cancelled",
      amount: Number(r.total ?? 0),
    });
  }
  for (const r of voRows) {
    lines.push({
      label: r.display_number ?? "Draft variation",
      description: r.status === "draft" ? "Undecided draft" : "Approved, not yet reflected in a Funding Request",
      amount: Number(r.material_impact ?? 0) + Number(r.labour_impact ?? 0),
    });
  }
  return lines;
}

function section(title: string, lines: DocumentSnapshotLine[]): DocumentSnapshotSection {
  return { title, lines, subtotal: lines.reduce((sum, l) => sum + l.amount, 0) };
}

/** Assembles the frozen `project_closeout_report` snapshot — the read half of `completeProject`. */
async function assembleCloseoutSnapshot(
  tx: AccountTx,
  project: {
    id: string;
    projectCode: string;
    name: string;
    clientName: string;
    site: string;
  },
  stageRows: { id: string; name: string }[],
  displayNumber: string,
  issuedOn: string,
): Promise<ProjectCloseoutReportSnapshot> {
  const stageFinancials: StageFinancials[] = [];
  for (const s of stageRows) {
    stageFinancials.push(await computeStageFinancials(tx, s.id));
  }
  const totals = sumFinancials(stageFinancials);
  const finalProjectVariance = materialVariance(totals) + labourVariance(totals);

  // Sequential, not Promise.all — every call shares the one Postgres client
  // `tx` (this transaction), and node-postgres does not support overlapping
  // concurrent queries on one client (same issue fixed in activity.ts).
  const approvedVariationLines = await getApprovedVariationLines(tx, project.id);
  const supplierBalances = await getProjectSupplierBalances(tx, project.id);
  const subcontractorBalances = await getProjectSubcontractorBalances(tx, project.id);
  const outstandingLines = await getOutstandingDocumentLines(tx, project.id);

  const sections: DocumentSnapshotSection[] = [
    section("Approved Variations", approvedVariationLines),
    section(
      "Supplier Balances",
      supplierBalances.map((b) => ({ label: b.name, amount: b.balance })),
    ),
    section(
      "Subcontractor Balances",
      subcontractorBalances.map((b) => ({ label: b.name, amount: b.balance })),
    ),
    section("Outstanding Documents", outstandingLines),
  ];

  return {
    kind: "project_closeout_report",
    displayNumber,
    issuedOn,
    projectName: project.name,
    projectCode: project.projectCode,
    counterpartyName: project.clientName,
    site: project.site,
    // Repurposed — see the snapshot type's own doc comment: there is no
    // single stage to name at project scope.
    stageName: `${stageRows.length} stage${stageRows.length === 1 ? "" : "s"}`,
    sections,
    total: finalProjectVariance,
    stageCount: stageRows.length,
    totalClientFunding: totals.clientDeposits,
    remainingClientFloat: availableFloat(totals),
    totalMaterialCommitments: totals.openPurchaseCommitments + totals.paidPurchases,
    totalActualMaterialCost: totals.paidPurchases,
    totalLabourAgreements: totals.labourAgreementTotal,
    totalLabourPaid: totals.labourPayments,
    totalFeesInvoiced: totals.feeInvoiced,
    totalFeesReceived: totals.feeReceived,
    finalProjectVariance,
  };
}

export type CompleteProjectResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-completable-status" | "gates-failed" };

/**
 * The atomic `Complete Project` transaction (ticket 04's Answer). Available
 * only from `active` or `on_hold` (not already `completed`/`archived`).
 * Re-checks the one hard gate server-side — never trusts the checklist
 * screen's own read, the same defensive posture `closeStage` already
 * follows one level down. On success: mints the `project_closeout_report`
 * document number, freezes the snapshot into a new `project_closeouts` row,
 * and sets `projects.status = 'completed'` / `completed_on = today` — all in
 * this one transaction, per the ticket's Answer.
 *
 * **Dependency note (Slice 4.2, ticket 03 — Stage Closeout Report):** that
 * slice is being built concurrently, in a separate worktree, and extends
 * `closeStage` to freeze its own `stage_closeout_report` snapshot per Stage.
 * That snapshot is not available in this worktree. Per the build brief, this
 * function falls back to computing the equivalent figures directly from
 * `computeStageFinancials` / live stage data (exactly what
 * `assembleCloseoutSnapshot` does above) rather than reading a Stage
 * Closeout Report snapshot that doesn't exist here yet. Since both this
 * report and Slice 4.2's are ultimately sourced from the same
 * `computeStageFinancials` figures, the numbers should already agree; the
 * integrator should double-check for drift once Slice 4.2 lands and decide
 * whether Project Closeout should switch to reading Slice 4.2's frozen
 * per-stage figures instead of re-deriving them live. See the Slice 4.3
 * runbook.
 */
export async function completeProject(
  projectId: string,
): Promise<CompleteProjectResult> {
  return withAccount(async (tx) => {
    const accountId = await getCurrentAccountId();

    const [project] = await tx
      .select({
        id: projects.id,
        status: projects.status,
        projectCode: projects.projectCode,
        name: projects.name,
        clientName: projects.clientName,
        site: projects.site,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return { ok: false as const, reason: "not-found" as const };
    if (!COMPLETABLE_PROJECT_STATUSES.has(project.status)) {
      return { ok: false as const, reason: "not-completable-status" as const };
    }

    const gates = await loadCloseoutGates(tx, projectId);
    if (!gates || projectCloseoutBlockers(gates).length > 0) {
      return { ok: false as const, reason: "gates-failed" as const };
    }

    const stageRows = await tx
      .select({ id: stages.id, name: stages.name })
      .from(stages)
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(stages.seq));

    const base = await claimDocumentNumber(tx, accountId, projectId, "project_closeout_report");
    const displayNumber = `PCR-${project.projectCode}-${pad3(base)}`;
    const issuedOn = new Date().toISOString().slice(0, 10);

    const snapshot = await assembleCloseoutSnapshot(
      tx,
      project,
      stageRows,
      displayNumber,
      issuedOn,
    );

    await tx.insert(projectCloseouts).values({
      accountId,
      projectId,
      displayNumber,
      documentSnapshot: snapshot,
    });

    await tx
      .update(projects)
      .set({ status: "completed", completedOn: issuedOn, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return { ok: true as const };
  });
}

export type ArchiveProjectResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-archivable-status" };

/**
 * `Archive Project` (ticket 04's Answer) — a plain, ungated-beyond-status
 * flip. No new gate beyond `status = 'completed'`, no new snapshot (the
 * Complete-time report already captured the final numbers), no un-archive
 * flow.
 */
export async function archiveProject(
  projectId: string,
): Promise<ArchiveProjectResult> {
  return withAccount(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id, status: projects.status })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return { ok: false as const, reason: "not-found" as const };
    if (project.status !== "completed") {
      return { ok: false as const, reason: "not-archivable-status" as const };
    }

    await tx
      .update(projects)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return { ok: true as const };
  });
}
