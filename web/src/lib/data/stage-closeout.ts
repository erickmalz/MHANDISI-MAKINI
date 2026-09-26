import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import {
  budgetVarianceTotal,
  feeOutstanding,
  forecastFundingRequirement,
  labourVariance,
  materialVariance,
} from "@/lib/finance";
import type {
  StageCloseoutGates,
  StageCloseoutPORef,
  StageCloseoutTaskRef,
  StageCloseoutVariationRef,
} from "@/lib/stage-closeout";
import { CLOSEABLE_STAGE_STATUSES, stageCloseoutBlockers } from "@/lib/stage-closeout";
import type { SurplusLineInput } from "@/lib/validation/stage-closeout";

import { getCurrentAccountId } from "./account-context";
import { claimDocumentNumber, pad3 } from "./document-numbers";
import { carryForwardSurplus, stockBalancesTx, writeOffStock, type StockLine } from "./material-stock";
import { readProjectFinancials, readStageFinancials } from "./stage-financials";
import { getStageReconciliationReport } from "./reconciliation";
import { projects, purchaseOrders, stageCloseouts, stages, tasks, variations } from "./schema";
import type { DocumentSnapshotSection, StageCloseoutReportSnapshot } from "./schema/snapshot";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Stage Closeout DAL (Phase 3 ticket 05) — the read side re-derives the
 * same four hard gates `closeStage` enforces, so the checklist screen and the
 * transaction can never disagree; the write side is the atomic `Close Stage`
 * transaction plus the post-closeout surplus-materials resolution that calls
 * straight into ticket 06's `carryForwardSurplus` / `writeOffStock`.
 *
 * No `accountId` in any signature — `withAccount` sets the tenant GUC and
 * Postgres RLS is the backstop, same posture as every other DAL file here.
 */

export type { StageCloseoutGates };

/**
 * Re-derive the stage's checklist gates from the live rows, inside a caller's
 * own transaction — internal, `tx`-scoped, same posture as
 * `carryForwardSurplus`/`writeOffStock`: `closeStage` calls this directly so
 * its own re-check runs on the same connection/transaction as its status
 * write, rather than nesting a second `withAccount` transaction inside the
 * first. Returns `null` for a missing / cross-account stage.
 */
async function loadCloseoutGates(
  tx: AccountTx,
  stageId: string,
): Promise<StageCloseoutGates | null> {
  const [stage] = await tx
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stage) return null;

  const openTasks = (await tx
    .select({ id: tasks.id, seq: tasks.seq, description: tasks.description })
    .from(tasks)
    .where(sql`${tasks.stageId} = ${stageId} AND ${tasks.status} NOT IN ('completed', 'cancelled')`)
    .orderBy(asc(tasks.seq))) as StageCloseoutTaskRef[];

  const nonTerminalVariations = (await tx
    .select({
      id: variations.id,
      displayNumber: variations.displayNumber,
      status: variations.status,
      description: variations.description,
    })
    .from(variations)
    .where(sql`${variations.stageId} = ${stageId} AND ${variations.status} IN ('draft', 'approved')`)
    .orderBy(asc(variations.requestedAt))) as StageCloseoutVariationRef[];

  const orderedPurchaseOrders = (await tx
    .select({ id: purchaseOrders.id, displayNumber: purchaseOrders.displayNumber })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.stageId, stageId), eq(purchaseOrders.status, "ordered")))
    .orderBy(asc(purchaseOrders.createdAt))) as StageCloseoutPORef[];

  const financials = await readStageFinancials(tx, stageId);

  return {
    openTasks,
    nonTerminalVariations,
    orderedPurchaseOrders,
    openLabourCommitments: financials.openLabourCommitments,
  };
}

/**
 * Re-derive the stage's checklist gates from the live rows — the same shape
 * `closeStage` re-checks server-side. Returns `null` for a missing /
 * cross-account stage. This is what the checklist screen reads.
 */
export async function getStageCloseoutGates(
  stageId: string,
): Promise<StageCloseoutGates | null> {
  return withAccount((tx) => loadCloseoutGates(tx, stageId));
}

export type CloseStageResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-closeable-status" | "gates-failed" };

/**
 * The atomic `Close Stage` transaction (ticket 05 §2; Phase 4 ticket 03).
 * Available only from `active` or `ready_for_closeout` (not `planned`,
 * `awaiting_funding`, `on_hold`, or `cancelled`). Re-checks all four hard
 * gates server-side — never trusts the checklist screen's own read, the same
 * defensive posture `issuePurchaseOrder`/`approveVariation` already follow
 * for their own preconditions. Sets `status = 'completed'` and
 * `completed_on = today`; no new column, no new enum value on `stages`
 * itself (ticket 05 §2 — `completed` already existed).
 *
 * Phase 4 ticket 03's resolved answer extends this same transaction to also
 * freeze the Stage Closeout Report: mint `SCR-{project_code}-{NNN}` (the same
 * `claimDocumentNumber` counter every other issued document uses) and write
 * one `stage_closeouts` row carrying a `document_snapshot`-shaped blob built
 * from the exact figures the checklist screen already showed the Engineer
 * read-only — `readStageFinancials`, `readProjectFinancials`,
 * `stockBalancesTx` — no new calculation engine. Close Stage *is* issuing the
 * report; there is no separate "Run Report" action.
 */
export async function closeStage(stageId: string): Promise<CloseStageResult> {
  const accountId = await getCurrentAccountId();

  // Read-only, ahead of the atomic transaction below — the same "Run
  // Financial Check" engine the Stage's own header button links to
  // (`getStageReconciliationReport`, Phase 3 ticket 04). Deliberately a
  // separate `withAccount` call, not nested inside the close transaction:
  // every other tx-scoped helper in this DAL avoids nesting a second
  // `withAccount`/`db.transaction()` inside a caller's own (see
  // `loadCloseoutGates`'s own doc comment), and folding the Reconciliation
  // Engine's full query set into the atomic close would add real weight for
  // a field that is purely informational and never gates closeout
  // (guidelines §34: "informational, not an accounting certification"). The
  // resulting race window — the score could theoretically be one heartbeat
  // stale against a concurrent edit — is the same class of accepted risk as
  // every other "read, then act" sequencing already in this codebase.
  const reconciliation = await getStageReconciliationReport(stageId);

  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({
        id: stages.id,
        status: stages.status,
        projectId: stages.projectId,
        name: stages.name,
        notes: stages.notes,
        projectName: projects.name,
        projectCode: projects.projectCode,
        clientName: projects.clientName,
        site: projects.site,
      })
      .from(stages)
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return { ok: false as const, reason: "not-found" as const };
    if (!CLOSEABLE_STAGE_STATUSES.has(stage.status)) {
      return { ok: false as const, reason: "not-closeable-status" as const };
    }

    const gates = await loadCloseoutGates(tx, stageId);
    if (!gates || stageCloseoutBlockers(gates).length > 0) {
      return { ok: false as const, reason: "gates-failed" as const };
    }

    const closedOn = new Date().toISOString().slice(0, 10);

    await tx
      .update(stages)
      .set({
        status: "completed",
        completedOn: closedOn,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId));

    // --- Freeze the Stage Closeout Report snapshot (Phase 4 ticket 03) ---
    const financials = await readStageFinancials(tx, stageId);
    const accumulatedVariance = materialVariance(
      (await readProjectFinancials(tx, stage.projectId)).totals,
    );
    const stockSurplus = await stockBalancesTx(tx, stage.projectId);

    const material = materialVariance(financials);
    const labour = labourVariance(financials);
    const ffr = forecastFundingRequirement(financials);
    const feeOut = feeOutstanding(financials);

    const materialSection: DocumentSnapshotSection = {
      title: "Material",
      lines: [
        { label: "Estimated (Approved Estimate)", amount: financials.materialEstimated },
        { label: "Actual (paid purchases)", amount: financials.paidPurchases },
        { label: "Variance", amount: material },
      ],
      subtotal: material,
    };
    const labourSection: DocumentSnapshotSection = {
      title: "Labour",
      lines: [
        { label: "Agreement", amount: financials.labourAgreementTotal },
        { label: "Actual (paid)", amount: financials.labourPayments },
        { label: "Variance", amount: labour },
      ],
      subtotal: labour,
    };

    const base = await claimDocumentNumber(
      tx,
      accountId,
      stage.projectId,
      "stage_closeout_report",
    );
    const displayNumber = `SCR-${stage.projectCode}-${pad3(base)}`;

    // Passed/Warning/Critical rollup, same three-bucket vocabulary as
    // `ReconciliationStatus` (`@/lib/reconciliation`) — critical wins over
    // warning wins over passed. `reconciliation` can only be `null` for a
    // stage id that `getStageReconciliationReport` itself couldn't resolve;
    // `closeStage` has already confirmed the stage exists by this point, so
    // this only guards a theoretical race, not the normal path — treated as
    // `warning` (not silently `passed`) so a report never overstates a check
    // it could not actually run.
    const financialCheckStatus: StageCloseoutReportSnapshot["financialCheckStatus"] =
      reconciliation == null
        ? "warning"
        : reconciliation.critical > 0
          ? "critical"
          : reconciliation.warnings > 0
            ? "warning"
            : "passed";

    const snapshot: StageCloseoutReportSnapshot = {
      kind: "stage_closeout_report",
      displayNumber,
      issuedOn: closedOn,
      projectName: stage.projectName,
      projectCode: stage.projectCode,
      // No Client/Supplier party the way a Funding Request or Purchase
      // Order has one — the Project's client is named here instead, since
      // this is still a record "a client ... might reference later" (ticket
      // 03's own reasoning).
      counterpartyName: stage.clientName,
      site: stage.site,
      stageName: stage.name,
      sections: [materialSection, labourSection],
      total: budgetVarianceTotal(financials),
      notes: stage.notes ?? undefined,

      financialCheckStatus,

      // Two of the four hard gates just re-checked above already guarantee
      // these for any stage that reaches this line (no `ordered` Purchase
      // Order; zero Open Labour Commitments) — written as a fact, not
      // re-derived. `documentsReconciled` has no live check behind it (the
      // Documents group is purely informational); `feeReconciled` /
      // `clientFundsReconciled` are genuinely derived — neither is a gate
      // (Phase 1 decision 03), so either can be `false` at close.
      materialsReconciled: true,
      labourReconciled: true,
      documentsReconciled: true,
      feeReconciled: feeOut <= 0,
      clientFundsReconciled: ffr <= 0,

      stageBudget: financials.materialEstimated + financials.labourAgreementTotal,
      actualCost: financials.paidPurchases + financials.labourPayments,

      materialEstimated: financials.materialEstimated,
      materialActual: financials.paidPurchases,
      materialVariance: material,
      accumulatedMaterialVariance: accumulatedVariance,

      labourAgreement: financials.labourAgreementTotal,
      labourActual: financials.labourPayments,
      labourVariance: labour,

      feeInvoiced: financials.feeInvoiced,
      feeReceived: financials.feeReceived,
      feeOutstanding: feeOut,

      clientDeposits: financials.clientDeposits,
      forecastFundingRequirement: ffr,

      materialStockSurplus: stockSurplus,
    };

    await tx.insert(stageCloseouts).values({
      accountId,
      stageId,
      baseNumber: base,
      displayNumber,
      documentSnapshot: snapshot,
      closedOn,
    });

    return { ok: true as const };
  });
}

/**
 * The frozen report's display number + close date, for the Stage Closeout
 * screen's own "which branch to show" decision (downloads vs. "Report not
 * available") — deliberately not the full `getStageCloseoutReportDocument`
 * (`@/lib/data/documents`), which also loads the Account's letterhead
 * profile that this check doesn't need. Returns `null` both for a stage not
 * yet closed and for one closed before this feature shipped (Phase 4 ticket
 * 03's resolved answer — no backfill).
 */
export async function getStageCloseoutReportSummary(
  stageId: string,
): Promise<{ displayNumber: string; closedOn: string } | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        displayNumber: stageCloseouts.displayNumber,
        closedOn: stageCloseouts.closedOn,
      })
      .from(stageCloseouts)
      .where(eq(stageCloseouts.stageId, stageId))
      .limit(1);
    return row ?? null;
  });
}

/**
 * The post-closeout "Carry Forward Surplus" action (ticket 05 §3, ticket 06
 * §3/§5): resolves the Engineer's identified surplus lines, each to either
 * Carried Forward (`carryForwardSurplus`) or Written Off (`writeOffStock`) —
 * ticket 06's own "Consequences for the spec" names Stage Closeout as the
 * owner of calling both. Only available once the stage is actually
 * `completed`; `false` for a missing/cross-account/not-yet-closed stage.
 * Runs in its own transaction, separate from `closeStage` — surplus is
 * identified and resolved as a **post**-closeout review step (ticket 05's own
 * "post-closeout actions" list), not a precondition of the close itself.
 */
export async function resolveSurplusMaterials(
  stageId: string,
  lines: SurplusLineInput[],
): Promise<boolean> {
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id, status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage || stage.status !== "completed") return false;

    const carryForwardLines: StockLine[] = lines
      .filter((l) => l.resolution === "carry_forward")
      .map((l) => ({ item: l.item, unit: l.unit, qty: l.qty }));
    const writeOffLines: StockLine[] = lines
      .filter((l) => l.resolution === "written_off")
      .map((l) => ({ item: l.item, unit: l.unit, qty: l.qty }));

    await carryForwardSurplus(tx, stageId, carryForwardLines);
    await writeOffStock(tx, stageId, writeOffLines);
    return true;
  });
}
