import "server-only";

import { eq, sql } from "drizzle-orm";

import { formatTZS, materialVariance } from "@/lib/finance";
import { stageStatusLabel } from "@/lib/project-view";
import {
  reconciliationRowStatus,
  reconciliationScore,
  type ReconciliationCheck,
  type ReconciliationFinding,
  type ReconciliationReport,
} from "@/lib/reconciliation";
import type { ProjectAlert, Stage, StageFinancials } from "@/lib/types";

import { computeStageAlerts, deriveProjectAlerts } from "./alerts";
import { computeStageFinancials } from "./projection";
import { projects, stages } from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Financial Reconciliation Engine ("Run Financial Check", guidelines §34;
 * ticket 04, `.scratch/phase3/issues/04-financial-reconciliation-engine.md`).
 * Computed **live, on demand — nothing stored** (same posture as
 * `computeStageFinancials`): a fresh transaction runs every time this is
 * called, so a stale score can never be shown.
 *
 * Ticket 04 walked all 17 guideline checks: 8 are already answered by the
 * existing Alerts feed (`deriveProjectAlerts` / `computeStageAlerts`), 3 are
 * structurally guaranteed by the schema/`finance.ts` and add nothing at
 * runtime (deposit provenance, fee exclusion from float, PO/commitment
 * tautologies — not built), 1 is descoped for a missing data field
 * (duplicate supplier invoices — no invoice-number field exists anywhere),
 * and 3 are genuinely new (checks 5, 8, 13 below). map.md's "Not yet
 * specified" flags two further residual checks (6, 16) with no other owner —
 * folded in here as simple versions, referencing Slice 3.2's variance
 * figures and Slice 3.1's status set respectively. Guideline check 17
 * ("closed stages have no unresolved commitments") is **not** re-checked
 * here: Slice 3.4's four Stage Closeout gates already make it structurally
 * impossible for a `completed` stage to carry an open commitment, the same
 * way checks 2-4 are structural rather than runtime (see
 * `.scratch/phase3/slice-3.4-runbook.md`'s "Interface for downstream slices"
 * section).
 *
 * Rather than re-deriving the Alerts feed's logic a second way, this calls
 * `deriveProjectAlerts`/`computeStageAlerts` directly and folds every alert
 * *family* they can produce into its own tally row: a family with no firing
 * instance this call counts as Passed; one with a firing instance counts as
 * that instance's own severity (an `info` finding still counts toward
 * Passed — guidelines §34 calls this tool "informational, not an accounting
 * certification" — but its message is still shown). This keeps the two
 * surfaces from ever disagreeing, per ticket 04 §4.
 */
export async function getStageReconciliationReport(
  stageId: string,
): Promise<ReconciliationReport | null> {
  return withAccount(async (tx) => {
    const [stageRow] = await tx
      .select({
        id: stages.id,
        projectId: stages.projectId,
        name: stages.name,
        seq: stages.seq,
        status: stages.status,
      })
      .from(stages)
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stageRow) return null;

    const financials = await computeStageFinancials(tx, stageId);
    const stageView: Stage = {
      id: stageRow.id,
      name: stageRow.name,
      seq: stageRow.seq,
      status: stageStatusLabel(stageRow.status),
      progressPercent: 0,
      financials,
    };

    const alerts: ProjectAlert[] = [
      ...deriveProjectAlerts(stageView),
      ...(await computeStageAlerts(tx, stageRow.projectId, stageId)),
    ];

    const checks: ReconciliationCheck[] = [
      ...alertFamilyChecks(alerts),
      await overPaymentVisibilityCheck(tx, stageId),
      await unexplainedLabourBalanceCheck(tx, stageId),
      await duplicatePaymentReferenceCheck(tx, stageId),
      procurementVsMaterialRequirementCheck(financials),
      await staleVariationsCheck(tx, stageId),
    ];

    let passed = 0;
    let warnings = 0;
    let critical = 0;
    for (const check of checks) {
      if (check.status === "critical") critical += 1;
      else if (check.status === "warning") warnings += 1;
      else passed += 1;
    }

    return {
      stageId,
      stageName: stageRow.name,
      passed,
      warnings,
      critical,
      score: reconciliationScore(passed, warnings, critical),
      checks,
    };
  });
}

/**
 * One tally row per *family* of alert id the Alerts feed can produce for a
 * stage (a family strips a per-record suffix, e.g. every `po-overdue-{id}`
 * collapses to one "Outstanding purchase orders — overdue" row) — not one
 * row per instance, since the guideline frames these as fixed checklist
 * items, not a per-record count. Checks 1 and 15 both name the same
 * underlying `unallocated-deposit` signal in ticket 04's own resolution, so
 * they share a single row rather than double-counting it.
 */
const ALERT_FAMILIES: { key: string; label: string; match: (id: string) => boolean }[] = [
  {
    key: "unallocated-deposit",
    label: "Client deposits reconcile to funding requests; unallocated client funds are identified (guideline checks 1 & 15)",
    match: (id) => id === "unallocated-deposit",
  },
  {
    key: "labour-exceeds-agreement",
    label: "Labour payments do not exceed approved labour (guideline check 7)",
    match: (id) => id.startsWith("labour-exceeds-agreement-"),
  },
  {
    key: "float-negative",
    label: "Negative float is highlighted (guideline check 9)",
    match: (id) => id === "float-negative",
  },
  {
    key: "po-missing-receipt",
    label: "Missing receipts are identified (guideline check 10)",
    match: (id) => id.startsWith("po-missing-receipt-"),
  },
  {
    key: "po-missing-delivery-note",
    label: "Missing delivery notes are identified (guideline check 11)",
    match: (id) => id.startsWith("po-missing-delivery-note-"),
  },
  {
    key: "po-outstanding",
    label: "Outstanding purchase orders are identified (guideline check 14)",
    match: (id) =>
      id.startsWith("po-overdue-") || id.startsWith("po-partial-delivery-") || id.startsWith("po-unpaid-"),
  },
  // The remaining alert ids are Operational Control's own extra ambient
  // signals, beyond the guideline's numbered 17 — ticket 04 §4 folds in the
  // *whole* Alerts output, not just the ids matching a numbered check, so
  // they still get a tally row each.
  {
    key: "material-not-ordered",
    label: "Procurement raised for estimated materials",
    match: (id) => id === "material-not-ordered",
  },
  {
    key: "funding-request-pending",
    label: "Funding request issued and awaiting deposit",
    match: (id) => id === "funding-request-pending",
  },
  {
    key: "additional-funding-required",
    label: "Additional funding required",
    match: (id) => id === "additional-funding-required",
  },
  {
    key: "fee-outstanding",
    label: "Supervisor fee invoice outstanding",
    match: (id) => id === "fee-outstanding",
  },
  {
    key: "float-below-upcoming-commitments",
    label: "Available Float covers open commitments",
    match: (id) => id === "float-below-upcoming-commitments",
  },
  {
    key: "stage-complete-labour-outstanding",
    label: "Completed stage has no outstanding labour commitments",
    match: (id) => id === "stage-complete-labour-outstanding",
  },
  {
    key: "labour-final-payment-incomplete",
    label: "Final labour payment recorded only once a task is complete",
    match: (id) => id.startsWith("labour-final-payment-incomplete-"),
  },
];

function alertFamilyChecks(alerts: ProjectAlert[]): ReconciliationCheck[] {
  return ALERT_FAMILIES.map(({ key, label, match }) => {
    const findings: ReconciliationFinding[] = alerts
      .filter((a) => match(a.id))
      .map((a) => ({ message: a.message, severity: a.severity, href: a.href }));
    return { key, label, status: reconciliationRowStatus(findings), findings };
  });
}

/**
 * Guideline check 5's real half (ticket 04 §1.5): a Purchase Order whose
 * paid total exceeds its ordered total is only ever written that way with a
 * typed `over_payment_reason` (soft-blocked in the DAL, guidelines §42.6) —
 * so this is a visibility item, not a bug. Severity: info (folds into
 * Passed), listing every such PO with its reason.
 */
async function overPaymentVisibilityCheck(
  tx: AccountTx,
  stageId: string,
): Promise<ReconciliationCheck> {
  const projectId = await resolveProjectId(tx, stageId);
  const rows = (
    await tx.execute<{
      id: string;
      display_number: string | null;
      ordered_total: string;
      paid_total: string;
      reason: string | null;
    }>(sql`
      SELECT
        po.id,
        po.display_number,
        COALESCE((SELECT SUM(l.qty_ordered * l.unit_price) FROM purchase_order_lines l
                   WHERE l.purchase_order_id = po.id), 0) AS ordered_total,
        COALESCE((SELECT SUM(p.amount) FROM payment_records p
                   WHERE p.purchase_order_id = po.id AND p.voided_at IS NULL), 0) AS paid_total,
        (SELECT p.over_payment_reason FROM payment_records p
          WHERE p.purchase_order_id = po.id AND p.voided_at IS NULL
            AND p.over_payment_reason IS NOT NULL
          ORDER BY p.created_at DESC LIMIT 1) AS reason
      FROM purchase_orders po
      WHERE po.stage_id = ${stageId} AND po.status != 'cancelled'
    `)
  ).rows;

  const findings: ReconciliationFinding[] = [];
  for (const row of rows) {
    const ordered = Number(row.ordered_total);
    const paid = Number(row.paid_total);
    if (paid > ordered) {
      const label = row.display_number ?? "This Purchase Order";
      const over = formatTZS(paid - ordered);
      findings.push({
        severity: "info",
        message: row.reason
          ? `${label} is paid ${over} over its ordered total — reason on file: "${row.reason}".`
          : `${label} is paid ${over} over its ordered total, with no reason on file.`,
        href: `/projects/${projectId}/procurement/${row.id}`,
      });
    }
  }
  return {
    key: "over-payment-visibility",
    label: "Over-payments against a Purchase Order carry a recorded reason (guideline check 5)",
    status: reconciliationRowStatus(findings),
    findings,
  };
}

/**
 * Guideline check 8 (ticket 04 §1.8): per-task itemised version of the
 * existing stage-level `stage-complete-labour-outstanding` alert — every
 * completed Task whose labour agreement still has an unpaid remainder,
 * named individually. Severity: warning.
 */
async function unexplainedLabourBalanceCheck(
  tx: AccountTx,
  stageId: string,
): Promise<ReconciliationCheck> {
  const rows = (
    await tx.execute<{
      id: string;
      description: string;
      project_id: string;
      agreement: string;
      paid: string;
    }>(sql`
      SELECT
        t.id,
        t.description,
        s.project_id,
        COALESCE(t.labour_revised, t.labour_original, 0) AS agreement,
        COALESCE((SELECT SUM(lp.amount) FROM labour_payments lp
                   WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid
      FROM tasks t
      JOIN stages s ON s.id = t.stage_id
      WHERE t.stage_id = ${stageId} AND t.status = 'completed'
    `)
  ).rows;

  const findings: ReconciliationFinding[] = [];
  for (const row of rows) {
    const balance = Number(row.agreement) - Number(row.paid);
    if (balance > 0) {
      findings.push({
        severity: "warning",
        message: `"${row.description}" is complete but still owes ${formatTZS(balance)} in labour.`,
        href: `/projects/${row.project_id}/tasks/${row.id}/edit`,
      });
    }
  }
  return {
    key: "completed-task-labour-balance",
    label: "Completed tasks have no unexplained labour balances (guideline check 8)",
    status: reconciliationRowStatus(findings),
    findings,
  };
}

/**
 * Guideline check 13 (ticket 04 §1.13): `payment_records.reference` is a
 * free-text field an Engineer types by hand — flag any two non-voided
 * payments sharing the same non-empty reference. The match is account-wide
 * (RLS already confines it to this Account), but only ever surfaced from
 * this stage's own payments, naming where the other half of the pair lives.
 * Severity: warning.
 */
async function duplicatePaymentReferenceCheck(
  tx: AccountTx,
  stageId: string,
): Promise<ReconciliationCheck> {
  const rows = (
    await tx.execute<{
      id1: string;
      reference: string;
      po1_number: string | null;
      id2: string;
      po2_number: string | null;
      stage2_name: string;
      project2_name: string;
      same_stage: boolean;
    }>(sql`
      SELECT
        p1.id AS id1,
        p1.reference,
        po1.display_number AS po1_number,
        p2.id AS id2,
        po2.display_number AS po2_number,
        s2.name AS stage2_name,
        pr2.name AS project2_name,
        (po2.stage_id = po1.stage_id) AS same_stage
      FROM payment_records p1
      JOIN purchase_orders po1 ON po1.id = p1.purchase_order_id
      JOIN payment_records p2 ON p2.reference = p1.reference AND p2.id != p1.id AND p2.voided_at IS NULL
      JOIN purchase_orders po2 ON po2.id = p2.purchase_order_id
      JOIN stages s2 ON s2.id = po2.stage_id
      JOIN projects pr2 ON pr2.id = s2.project_id
      WHERE po1.stage_id = ${stageId}
        AND p1.voided_at IS NULL
        AND p1.reference IS NOT NULL
        AND btrim(p1.reference) != ''
    `)
  ).rows;

  const seen = new Set<string>();
  const findings: ReconciliationFinding[] = [];
  for (const row of rows) {
    const pairKey = [row.id1, row.id2].sort().join(":");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    const label1 = row.po1_number ?? "a Purchase Order on this stage";
    const where2 = row.same_stage
      ? `${row.po2_number ?? "another payment"} on this same stage`
      : `${row.po2_number ?? "another payment"} on ${row.stage2_name} (${row.project2_name})`;
    findings.push({
      severity: "warning",
      message: `Payment reference "${row.reference}" on ${label1} is also recorded against ${where2} — check for a duplicate entry.`,
    });
  }
  return {
    key: "duplicate-payment-reference",
    label: "Duplicate payment references are flagged (guideline check 13)",
    status: reconciliationRowStatus(findings),
    findings,
  };
}

/**
 * Guideline check 6, residual (map.md "Not yet specified" — no owning
 * ticket, folded in here as a simple version per the build brief): "procurement
 * does not exceed material requirements without explanation." There is no
 * stable per-item key between Material Take-Off lines and Purchase Order
 * lines (ticket 03/Slice 3.2 confirmed this, so `materialVariance` stays
 * stage-level), but that same stage-level figure already includes every
 * approved Variation's material impact (Slice 3.1/3.2's interface note) — so
 * a negative Material Variance (actual purchase cost exceeding the estimate,
 * Variations included) *is* exactly "procurement exceeding material
 * requirements with no Variation on file to explain it." Severity: warning.
 * Pure — no query, reuses the already-computed `StageFinancials`.
 */
function procurementVsMaterialRequirementCheck(
  financials: StageFinancials,
): ReconciliationCheck {
  const variance = materialVariance(financials);
  const findings: ReconciliationFinding[] =
    variance < 0
      ? [
          {
            severity: "warning",
            message: `Purchase Order costs exceed this stage's material estimate (including any approved Variations) by ${formatTZS(-variance)}, with no further Variation on file to explain the difference.`,
          },
        ]
      : [];
  return {
    key: "procurement-vs-material-requirement",
    label: "Procurement does not exceed material requirements without explanation (guideline check 6)",
    status: reconciliationRowStatus(findings),
    findings,
  };
}

/** How long an undecided Draft Variation sits before it is flagged as stale. */
const VARIATION_STALENESS_DAYS = 14;

/**
 * Guideline check 16, residual (map.md "Not yet specified" — ticket 04's own
 * "Coordinator notes" recommended this exact shape once ticket 01/Slice 3.1
 * landed): flag a Variation sitting in `draft` past a staleness window — the
 * real concern is an *undecided* Variation, not an "unapproved" one silently
 * affecting money (an Approved Variation is the only one that ever writes
 * through to `labourRevised`/`material_lines`, so an unapproved one already
 * has zero financial effect by construction). Severity: warning.
 */
async function staleVariationsCheck(
  tx: AccountTx,
  stageId: string,
): Promise<ReconciliationCheck> {
  const rows = (
    await tx.execute<{
      id: string;
      description: string;
      requested_at: string;
      days_open: number;
      project_id: string;
    }>(sql`
      SELECT
        v.id,
        v.description,
        v.requested_at,
        EXTRACT(DAY FROM now() - v.requested_at)::int AS days_open,
        s.project_id
      FROM variations v
      JOIN stages s ON s.id = v.stage_id
      WHERE v.stage_id = ${stageId}
        AND v.status = 'draft'
        AND v.requested_at < now() - make_interval(days => ${VARIATION_STALENESS_DAYS})
    `)
  ).rows;

  const findings: ReconciliationFinding[] = rows.map((row) => ({
    severity: "warning",
    message: `Variation "${row.description}" has been a Draft for ${row.days_open} days with no Approve/Reject decision.`,
    href: `/projects/${row.project_id}/variations/${row.id}`,
  }));
  return {
    key: "stale-draft-variations",
    label: "Variations without a decision are identified (guideline check 16)",
    status: reconciliationRowStatus(findings),
    findings,
  };
}

async function resolveProjectId(tx: AccountTx, stageId: string): Promise<string> {
  const [row] = await tx
    .select({ projectId: stages.projectId })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  return row?.projectId ?? "";
}
