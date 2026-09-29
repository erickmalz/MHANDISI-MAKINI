import "server-only";

import type { ReportFilters } from "@/lib/reports/filters";

import { sql } from "drizzle-orm";

import {
  aggregateStageFinancials,
  availableFloat,
  feeOutstanding,
  financialHealth,
  forecastFundingRequirement,
  materialVariance,
  paymentsMade,
  totalCommitted,
} from "@/lib/finance";
import {
  depositOutstanding,
  depositTarget,
  depositedTotal,
  deriveFRStatus,
  type FRKind,
  type FRStatus,
} from "@/lib/funding";
import {
  acceptedValue,
  derivePOStatus,
  orderedTotal,
  outstandingValue,
  paidTotal,
  type POStatus,
} from "@/lib/procurement";
import { taskStatusLabel, type TaskStatus } from "@/lib/tasks";
import type { FinancialHealth, StageStatus } from "@/lib/types";
import {
  isVariationFunded,
  type Variation,
  type VariationStatus,
} from "@/lib/variations";

import { listFundingRequests } from "./funding";
import { listPurchaseOrders } from "./procurement";
import { getProjectOverview } from "./projects";
import { listVariationsForStage } from "./variations";
import { withAccount } from "./with-account";

/**
 * The Advanced Reporting Dashboard (Phase 4 ticket 06,
 * `.scratch/phase4/issues/06-advanced-reporting-dashboard.md`) — six live,
 * read-only, **per-project** report screens (guidelines §38, minus Supplier /
 * Subcontractor Statements — already shipped, Operational Control decision 5
 * — and minus the Stage Closeout Report, ticket 03's own slice).
 *
 * Every function here takes a single `projectId` and returns figures scoped
 * to that project only — no cross-project aggregation anywhere (the Choose
 * Project page's own shipped rule, `web/src/app/(app)/page.tsx`). Like the
 * Financial Reconciliation Engine and the Supplier/Subcontractor Statements,
 * these are computed **live, on every call — nothing stored**, and there is
 * no PDF/JPG export: these are always-current analytical views, not frozen
 * issued documents.
 *
 * This is presentation over data that (almost) entirely already exists —
 * each function assembles its report from `getProjectOverview` (per-stage
 * `StageFinancials`, already the single source for float/commitment/variance
 * figures via `@/lib/finance`), `listFundingRequests`, `listPurchaseOrders`,
 * and `listVariationsForStage`, the same DAL functions the Funding,
 * Procurement and Variation screens already call. Only two genuinely new,
 * narrowly-scoped queries exist here: the Material Cost Report's
 * original-estimate split (§ below) and the Labour Report's per-task project
 * listing (no existing function returns every task across every stage of a
 * project in one call).
 *
 * No `accountId` in any signature, same as every other DAL read: `withAccount`
 * / the DAL functions this calls scope every query to the caller's Account.
 * A missing / cross-account `projectId` resolves to `null` (via
 * `getProjectOverview`), same as every other project-scoped screen.
 */

// ---------------------------------------------------------------------------
// 1. Project Financial Summary
// ---------------------------------------------------------------------------

export interface ProjectFinancialSummaryStageRow {
  stageId: string;
  stageName: string;
  status: StageStatus;
  health: FinancialHealth;
  clientDeposits: number;
  commitments: number;
  payments: number;
  availableFloat: number;
  forecastFundingRequirement: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  /** Σ deposit target of every live (issued or later, non-cancelled) Funding Request. */
  fundingRequested: number;
  /** Σ non-voided deposits against those same requests. */
  fundingReceived: number;
  feesInvoiced: number;
  feesReceived: number;
  feesOutstanding: number;
  /** Σ Total Committed (`@/lib/finance`'s `totalCommitted`) across every stage. */
  commitments: number;
  /** Σ money actually paid out (purchases + labour + petty cash + other) across every stage. */
  payments: number;
  /**
   * Σ Available Float across every stage — informational only: a stage's
   * float is not fungible with another stage's (deposits are Funding-Request-
   * and therefore stage-scoped, per `readStageFinancials`). The
   * stage-by-stage table below is the figure to act on.
   */
  availableFloat: number;
  /** Σ max(0, Forecast Funding Requirement) across every stage — a negative (surplus) stage never offsets a shortfall stage's own requirement. */
  forecastShortfall: number;
  stages: ProjectFinancialSummaryStageRow[];
}

/**
 * The project-level roll-up of every stage's already-computed
 * `StageFinancials` (via `getProjectOverview`) plus the project's Funding
 * Requests (via `listFundingRequests`). No new financial formula — every
 * figure here is a straight sum of `@/lib/finance`'s existing per-stage
 * derivations, or `@/lib/funding`'s existing per-request derivations.
 */
export async function getProjectFinancialSummary(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<ProjectFinancialSummary | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const fundingRequests = await listFundingRequests(projectId);
  let fundingRequested = 0;
  let fundingReceived = 0;
  for (const fr of fundingRequests) {
    if (fr.status === "draft" || fr.status === "cancelled") continue;
    fundingRequested += depositTarget(fr);
    fundingReceived += depositedTotal(fr);
  }

  let feesInvoiced = 0;
  let feesReceived = 0;
  let feesOutstanding = 0;

  const stages: ProjectFinancialSummaryStageRow[] = project.stages.map((s) => {
    const f = s.financials;
    feesInvoiced += f.feeInvoiced;
    feesReceived += f.feeReceived;
    feesOutstanding += feeOutstanding(f);

    return {
      stageId: s.id,
      stageName: s.name,
      status: s.status,
      health: financialHealth(f),
      clientDeposits: f.clientDeposits,
      commitments: totalCommitted(f),
      payments: paymentsMade(f),
      availableFloat: availableFloat(f),
      forecastFundingRequirement: forecastFundingRequirement(f),
    };
  });

  const totals = aggregateStageFinancials(project.stages.map((s) => s.financials));

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    fundingRequested,
    fundingReceived,
    feesInvoiced,
    feesReceived,
    feesOutstanding,
    commitments: totals.commitments,
    payments: totals.payments,
    availableFloat: totals.availableFloat,
    forecastShortfall: totals.forecastShortfall,
    stages,
  };
}

// ---------------------------------------------------------------------------
// 2. Material Cost Report
// ---------------------------------------------------------------------------

export interface MaterialCostReportRow {
  stageId: string;
  stageName: string;
  /** Σ every take-off line's original qty × original unit cost — never revised. */
  estimatedOriginal: number;
  /** The stage's current estimate (`StageFinancials.materialEstimated` — revised-if-set, includes Variation-appended lines). */
  estimatedRevised: number;
  /** Σ non-voided Purchase Order payments for the stage (`StageFinancials.paidPurchases`). */
  actual: number;
  /** `@/lib/finance`'s `materialVariance` — positive = saving. */
  variance: number;
}

export interface MaterialCostReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  rows: MaterialCostReportRow[];
  totals: Omit<MaterialCostReportRow, "stageId" | "stageName">;
}

/**
 * Stage-level, matching Budget Variance Analysis's own granularity (Phase 3
 * ticket 03): `@/lib/finance`'s own doc comment on `materialVariance` is
 * explicit that there is no stable per-line key between a free-text Material
 * Take-Off line and a free-text Purchase Order line, so "Actual" and
 * "Variance" cannot be shown any finer than this.
 *
 * Pure reuse, no query of its own: `estimatedOriginal` / `estimatedRevised` /
 * `actual` / `variance` are `StageFinancials.materialEstimatedOriginal` /
 * `materialEstimated` / `paidPurchases` and `materialVariance` (via
 * `getProjectOverview`), so every figure comes from one read.
 */
export async function getMaterialCostReport(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<MaterialCostReport | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const rows: MaterialCostReportRow[] = project.stages.map((s) => {
    const f = s.financials;
    return {
      stageId: s.id,
      stageName: s.name,
      estimatedOriginal: f.materialEstimatedOriginal,
      estimatedRevised: f.materialEstimated,
      actual: f.paidPurchases,
      variance: materialVariance(f),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      estimatedOriginal: acc.estimatedOriginal + r.estimatedOriginal,
      estimatedRevised: acc.estimatedRevised + r.estimatedRevised,
      actual: acc.actual + r.actual,
      variance: acc.variance + r.variance,
    }),
    { estimatedOriginal: 0, estimatedRevised: 0, actual: 0, variance: 0 },
  );

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    rows,
    totals,
  };
}

// ---------------------------------------------------------------------------
// 3. Procurement Report
// ---------------------------------------------------------------------------

export interface ProcurementReportRow {
  purchaseOrderId: string;
  displayNumber: string | null;
  status: POStatus;
  stageName: string;
  supplierName: string;
  ordered: number;
  delivered: number;
  paid: number;
  outstanding: number;
}

export interface ProcurementReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  /** Σ `StageFinancials.materialEstimated` across every stage — what procurement is meant to cover. */
  required: number;
  rows: ProcurementReportRow[];
  totals: { ordered: number; delivered: number; paid: number; outstanding: number };
}

/**
 * Pure assembly, no new calculation: every row is `listPurchaseOrders`'
 * `PurchaseOrder` view-model run through `@/lib/procurement`'s existing
 * derivations (`orderedTotal`, `acceptedValue` for "Delivered" — the value of
 * what was actually accepted, `paidTotal`, `outstandingValue`,
 * `derivePOStatus`). "Required" reuses the project's already-computed
 * material estimate (`StageFinancials.materialEstimated`, summed) so the
 * report can show the gap between what the take-off calls for and what has
 * actually been ordered. Cancelled orders are listed but excluded from the
 * totals — the same rule `getSupplierStatement`'s `outstandingBalance` already follows.
 */
export async function getProcurementReport(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<ProcurementReport | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const orders = await listPurchaseOrders(projectId);
  const required = project.stages.reduce(
    (sum, s) => sum + s.financials.materialEstimated,
    0,
  );

  const rows: ProcurementReportRow[] = orders.map((po) => ({
    purchaseOrderId: po.id,
    displayNumber: po.displayNumber,
    status: derivePOStatus(po),
    stageName: po.stageName,
    supplierName: po.supplierName,
    ordered: orderedTotal(po),
    delivered: acceptedValue(po),
    paid: paidTotal(po),
    outstanding: outstandingValue(po),
  }));

  const totals = orders.reduce(
    (acc, po) => {
      if (po.status === "cancelled") return acc;
      return {
        ordered: acc.ordered + orderedTotal(po),
        delivered: acc.delivered + acceptedValue(po),
        paid: acc.paid + paidTotal(po),
        outstanding: acc.outstanding + Math.max(0, outstandingValue(po)),
      };
    },
    { ordered: 0, delivered: 0, paid: 0, outstanding: 0 },
  );

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    required,
    rows,
    totals,
  };
}

// ---------------------------------------------------------------------------
// 4. Labour Report
// ---------------------------------------------------------------------------

export interface LabourReportRow {
  taskId: string;
  stageName: string;
  subcontractorName: string;
  taskDescription: string;
  status: string;
  agreed: number;
  /** `null` when the task's labour has never been revised. */
  revised: number | null;
  paid: number;
  outstanding: number;
}

export interface LabourReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  rows: LabourReportRow[];
  totals: { agreed: number; revised: number; paid: number; outstanding: number };
}

/**
 * Every Task across every stage of the project, with its Subcontractor,
 * agreed / revised labour figure and non-voided payments — the one genuinely
 * new query in this file, since no existing DAL function lists every task in
 * a *project* (`listTasksForStage` is per-stage, `getSubcontractorStatement`
 * is per-subcontractor account-wide). The agreed/paid/outstanding math itself
 * is identical to `readStageFinancials`'s own labour query and
 * `getSubcontractorStatement`'s task rows — no new formula, just a wider scope.
 */
export async function getLabourReport(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<LabourReport | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const taskRows = await withAccount(async (tx) => {
    const { rows } = await tx.execute<{
      task_id: string;
      stage_name: string;
      subcontractor_name: string | null;
      description: string;
      status: string;
      agreed: string;
      revised: string | null;
      paid: string;
    }>(sql`
      SELECT
        t.id AS task_id,
        s.name AS stage_name,
        sc.name AS subcontractor_name,
        t.description,
        t.status,
        COALESCE(t.labour_original, 0) AS agreed,
        t.labour_revised AS revised,
        COALESCE((SELECT SUM(lp.amount) FROM labour_payments lp
                   WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid
      FROM tasks t
      JOIN stages s ON s.id = t.stage_id
      LEFT JOIN subcontractors sc ON sc.id = t.subcontractor_id
      WHERE s.project_id = ${projectId}
      ORDER BY s.seq ASC, t.seq ASC
    `);
    return rows;
  });

  const rows: LabourReportRow[] = taskRows.map((r) => {
    const agreed = Number(r.agreed);
    const revised = r.revised != null ? Number(r.revised) : null;
    const paid = Number(r.paid);
    const outstanding = Math.max(0, (revised ?? agreed) - paid);
    return {
      taskId: r.task_id,
      stageName: r.stage_name,
      subcontractorName: r.subcontractor_name ?? "Unassigned",
      taskDescription: r.description,
      status: taskStatusLabel(r.status as TaskStatus),
      agreed,
      revised,
      paid,
      outstanding,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      agreed: acc.agreed + r.agreed,
      revised: acc.revised + (r.revised ?? r.agreed),
      paid: acc.paid + r.paid,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { agreed: 0, revised: 0, paid: 0, outstanding: 0 },
  );

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    rows,
    totals,
  };
}

// ---------------------------------------------------------------------------
// 5. Funding Report
// ---------------------------------------------------------------------------

export interface FundingReportRow {
  fundingRequestId: string;
  displayNumber: string | null;
  kind: FRKind;
  stageName: string;
  status: FRStatus;
  amountRequested: number;
  amountDeposited: number;
  balance: number;
}

export interface FundingReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  rows: FundingReportRow[];
  totals: { requested: number; deposited: number; balance: number };
}

/**
 * Pure reuse — zero new calculation. Every row is `listFundingRequests`' own
 * `FundingRequest` view-model run through `@/lib/funding`'s existing
 * derivations (`deriveFRStatus`, `depositTarget`, `depositedTotal`,
 * `depositOutstanding`), the same functions the Funding Requests list screen
 * already calls. Totals exclude Draft (nothing has actually been asked of
 * the client yet) and Cancelled requests.
 */
export async function getFundingReport(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<FundingReport | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const requests = await listFundingRequests(projectId);
  const rows: FundingReportRow[] = requests.map((fr) => ({
    fundingRequestId: fr.id,
    displayNumber: fr.displayNumber,
    kind: fr.kind,
    stageName: fr.stageName,
    status: deriveFRStatus(fr),
    amountRequested: depositTarget(fr),
    amountDeposited: depositedTotal(fr),
    balance: depositOutstanding(fr),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      if (r.status === "Draft" || r.status === "Cancelled") return acc;
      return {
        requested: acc.requested + r.amountRequested,
        deposited: acc.deposited + r.amountDeposited,
        balance: acc.balance + r.balance,
      };
    },
    { requested: 0, deposited: 0, balance: 0 },
  );

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    rows,
    totals,
  };
}

// ---------------------------------------------------------------------------
// 6. Variation Report
// ---------------------------------------------------------------------------

export interface VariationReportRow {
  variationId: string;
  variationLabel: string;
  stageName: string;
  taskDescription: string;
  /** The Variation's own description — "what changed" in the scope. */
  scopeImpact: string;
  /** materialImpact + labourImpact (feeImpact is carried as a note only, per `@/lib/variations`). */
  additionalCost: number;
  /** The raw stored status — `VariationStatusBadge` already renders its label; no separate string field needed. */
  approvalStatus: VariationStatus;
  fundingStatus: string;
  requestedAt: string;
}

export interface VariationReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  rows: VariationReportRow[];
  totals: { additionalCostApproved: number };
}

function variationFundingStatus(
  v: Pick<Variation, "status" | "fundingRequestLinks">,
): string {
  if (v.status !== "approved") return "Not applicable";
  if (v.fundingRequestLinks.length === 0) return "Not linked to a funding request";
  return isVariationFunded(v) ? "Funded" : "Funding request pending";
}

/**
 * Every Variation across every stage of the project. Reuses
 * `listVariationsForStage` (Phase 3 ticket 01's own DAL function, unchanged)
 * once per stage rather than duplicating its join/assembly logic — there is
 * no project-scoped variant of it today, and stage counts per project are
 * small, so this stays a thin orchestration rather than new query logic.
 * `approvalStatus` carries the raw stored status (the UI's
 * `VariationStatusBadge` already renders its label); the "Funded" derivation
 * is `@/lib/variations`'s `isVariationFunded`, unchanged. `additionalCost` is
 * the one small new roll-up (material + labour impact).
 */
export async function getVariationReport(
  projectId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<VariationReport | null> {
  void filters;
  const project = await getProjectOverview(projectId);
  if (!project) return null;

  const perStage = await Promise.all(
    project.stages.map((s) => listVariationsForStage(s.id)),
  );
  const variations = perStage.flat();

  const rows: VariationReportRow[] = variations.map((v) => ({
    variationId: v.id,
    variationLabel: v.displayNumber ?? "Draft",
    stageName: v.stageName,
    taskDescription: v.taskDescription,
    scopeImpact: v.description,
    additionalCost: (v.materialImpact ?? 0) + (v.labourImpact ?? 0),
    approvalStatus: v.status,
    fundingStatus: variationFundingStatus(v),
    requestedAt: v.requestedAt,
  }));

  const additionalCostApproved = variations
    .filter((v) => v.status === "approved")
    .reduce((sum, v) => sum + (v.materialImpact ?? 0) + (v.labourImpact ?? 0), 0);

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    rows,
    totals: { additionalCostApproved },
  };
}
