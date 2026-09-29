import "server-only";

import { cache } from "react";
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
import {
  FR_KIND_ORDER,
  FR_STATUS_SLUG,
  PO_STATUS_SLUG,
  TASK_STATUS_ORDER,
  VARIATION_FUNDING_SLUG,
  VARIATION_STATUS_ORDER,
  type FilterOptions,
  inDateRange,
  presentInOrder,
  sanitizeFilters,
  sortedByLabel,
  toEatDate,
} from "@/lib/reports/filter-logic";
import type { FilterOption, ReportFilters } from "@/lib/reports/filters";
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
 *
 * **Filters** (`.scratch/reports-toolbar/issues/02-which-filters-each-report-gets.md`):
 * every function takes the screen's `ReportFilters`, drops any value that
 * doesn't occur in this project (so a foreign or stale id means "All"), and
 * applies the rest with AND. Totals and headline sums recompute over the rows
 * shown; figures that only exist per stage (Procurement "Required", the
 * Financial Summary headline) follow the Stage filter only. A date range picks
 * rows by their own date; money columns stay current. Each report also returns
 * `filterOptions` (the choices per dimension) and `appliedFilters` (what was
 * actually applied), which `getReportFilterState` builds on. The underlying
 * reads are wrapped in React `cache`, so a screen that asks for both the
 * filtered report and its filter state reads the database once per request.
 */

const loadOverview = cache(getProjectOverview);
const loadFundingRequests = cache(listFundingRequests);
const loadPurchaseOrders = cache(listPurchaseOrders);

/** Every stage of the project, in seq order, as filter options. */
function stageOptions(project: { stages: { id: string; name: string }[] }): FilterOption[] {
  return project.stages.map((s) => ({ value: s.id, label: s.name }));
}

/** What every filtered report carries besides its own figures. */
export interface ReportFilterFields {
  /** The choices per dimension — only values that occur in this project. Enum labels are raw values. */
  filterOptions: FilterOptions;
  /** The filters actually applied, after unknown values were dropped. */
  appliedFilters: ReportFilters;
}

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

export type FilteredProjectFinancialSummary = ProjectFinancialSummary & ReportFilterFields;

/**
 * The project-level roll-up of every stage's already-computed
 * `StageFinancials` (via `getProjectOverview`) plus the project's Funding
 * Requests (via `listFundingRequests`). No new financial formula — every
 * figure here is a straight sum of `@/lib/finance`'s existing per-stage
 * derivations, or `@/lib/funding`'s existing per-request derivations.
 */
export async function getProjectFinancialSummary(
  projectId: string,
  /** Stage only — filtered to a stage, every figure is that stage's own. */
  filters: ReportFilters = {},
): Promise<FilteredProjectFinancialSummary | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const filterOptions: FilterOptions = { stage: stageOptions(project) };
  const appliedFilters = sanitizeFilters("financial-summary", filters, filterOptions);
  const inScope = project.stages.filter(
    (s) => !appliedFilters.stage || s.id === appliedFilters.stage,
  );

  const fundingRequests = await loadFundingRequests(projectId);
  let fundingRequested = 0;
  let fundingReceived = 0;
  for (const fr of fundingRequests) {
    if (fr.status === "draft" || fr.status === "cancelled") continue;
    if (appliedFilters.stage && fr.stageId !== appliedFilters.stage) continue;
    fundingRequested += depositTarget(fr);
    fundingReceived += depositedTotal(fr);
  }

  let feesInvoiced = 0;
  let feesReceived = 0;
  let feesOutstanding = 0;

  const stages: ProjectFinancialSummaryStageRow[] = inScope.map((s) => {
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

  const totals = aggregateStageFinancials(inScope.map((s) => s.financials));

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
    filterOptions,
    appliedFilters,
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

export type FilteredMaterialCostReport = MaterialCostReport & ReportFilterFields;

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
): Promise<FilteredMaterialCostReport | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const filterOptions: FilterOptions = { stage: stageOptions(project) };
  const appliedFilters = sanitizeFilters("material-cost", filters, filterOptions);

  const inScope = project.stages.filter(
    (s) => !appliedFilters.stage || s.id === appliedFilters.stage,
  );
  const rows: MaterialCostReportRow[] = inScope.map((s) => {
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
    filterOptions,
    appliedFilters,
  };
}

// ---------------------------------------------------------------------------
// 3. Procurement Report
// ---------------------------------------------------------------------------

export interface ProcurementReportRow {
  purchaseOrderId: string;
  displayNumber: string | null;
  status: POStatus;
  stageId: string;
  stageName: string;
  supplierId: string | null;
  supplierName: string;
  /** The date the PO was issued (EAT, YYYY-MM-DD); `null` while Planned. */
  orderedOn: string | null;
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

export type FilteredProcurementReport = ProcurementReport & ReportFilterFields;

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
  /** Stage · Supplier · PO status · Issued date range. "Required" follows Stage only. */
  filters: ReportFilters = {},
): Promise<FilteredProcurementReport | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const orders = await loadPurchaseOrders(projectId);
  const all = orders.map((po) => ({
    po,
    status: derivePOStatus(po),
    orderedOn: toEatDate(po.orderedAt),
  }));

  const filterOptions: FilterOptions = {
    stage: stageOptions(project),
    supplier: sortedByLabel(
      all
        .filter(({ po }) => po.supplierId != null)
        .map(({ po }) => ({ value: po.supplierId as string, label: po.supplierName })),
    ),
    status: presentInOrder(
      Object.values(PO_STATUS_SLUG),
      all.map(({ status }) => PO_STATUS_SLUG[status]),
    ),
  };
  const f = sanitizeFilters("procurement", filters, filterOptions);

  const shown = all.filter(
    ({ po, status, orderedOn }) =>
      (!f.stage || po.stageId === f.stage) &&
      (!f.supplier || po.supplierId === f.supplier) &&
      (!f.status || PO_STATUS_SLUG[status] === f.status) &&
      inDateRange(orderedOn, f.from, f.to),
  );

  const required = project.stages
    .filter((s) => !f.stage || s.id === f.stage)
    .reduce((sum, s) => sum + s.financials.materialEstimated, 0);

  const rows: ProcurementReportRow[] = shown.map(({ po, status, orderedOn }) => ({
    purchaseOrderId: po.id,
    displayNumber: po.displayNumber,
    status,
    stageId: po.stageId,
    stageName: po.stageName,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    orderedOn,
    ordered: orderedTotal(po),
    delivered: acceptedValue(po),
    paid: paidTotal(po),
    outstanding: outstandingValue(po),
  }));

  const totals = shown.reduce(
    (acc, { po }) => {
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
    filterOptions,
    appliedFilters: f,
  };
}

// ---------------------------------------------------------------------------
// 4. Labour Report
// ---------------------------------------------------------------------------

export interface LabourReportRow {
  taskId: string;
  stageId: string;
  stageName: string;
  subcontractorId: string | null;
  subcontractorName: string;
  taskDescription: string;
  /** Display label ("On hold"); `statusValue` is the stored value. */
  status: string;
  statusValue: TaskStatus;
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

export type FilteredLabourReport = LabourReport & ReportFilterFields;

type LabourTaskRow = {
  task_id: string;
  stage_id: string;
  stage_name: string;
  subcontractor_id: string | null;
  subcontractor_name: string | null;
  description: string;
  status: string;
  agreed: string;
  revised: string | null;
  paid: string;
};

const loadLabourTasks = cache(async (projectId: string): Promise<LabourTaskRow[]> =>
  withAccount(async (tx) => {
    const { rows } = await tx.execute<LabourTaskRow>(sql`
      SELECT
        t.id AS task_id,
        s.id AS stage_id,
        s.name AS stage_name,
        sc.id AS subcontractor_id,
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
  }),
);

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
  /** Stage · Subcontractor · Task status. */
  filters: ReportFilters = {},
): Promise<FilteredLabourReport | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const taskRows = await loadLabourTasks(projectId);

  const filterOptions: FilterOptions = {
    stage: stageOptions(project),
    subcontractor: sortedByLabel(
      taskRows
        .filter((r) => r.subcontractor_id != null)
        .map((r) => ({ value: r.subcontractor_id as string, label: r.subcontractor_name ?? "" })),
    ),
    status: presentInOrder(TASK_STATUS_ORDER, taskRows.map((r) => r.status)),
  };
  const f = sanitizeFilters("labour", filters, filterOptions);

  const rows: LabourReportRow[] = taskRows
    .filter(
      (r) =>
        (!f.stage || r.stage_id === f.stage) &&
        (!f.subcontractor || r.subcontractor_id === f.subcontractor) &&
        (!f.status || r.status === f.status),
    )
    .map((r) => {
      const agreed = Number(r.agreed);
      const revised = r.revised != null ? Number(r.revised) : null;
      const paid = Number(r.paid);
      const outstanding = Math.max(0, (revised ?? agreed) - paid);
      return {
        taskId: r.task_id,
        stageId: r.stage_id,
        stageName: r.stage_name,
        subcontractorId: r.subcontractor_id,
        subcontractorName: r.subcontractor_name ?? "Unassigned",
        taskDescription: r.description,
        status: taskStatusLabel(r.status as TaskStatus),
        statusValue: r.status as TaskStatus,
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
    filterOptions,
    appliedFilters: f,
  };
}

// ---------------------------------------------------------------------------
// 5. Funding Report
// ---------------------------------------------------------------------------

export interface FundingReportRow {
  fundingRequestId: string;
  displayNumber: string | null;
  kind: FRKind;
  stageId: string;
  stageName: string;
  /** The date the request was issued (EAT, YYYY-MM-DD); `null` while Draft. */
  issuedOn: string | null;
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

export type FilteredFundingReport = FundingReport & ReportFilterFields;

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
  /** Stage · Kind · Status · Issued date range. */
  filters: ReportFilters = {},
): Promise<FilteredFundingReport | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const requests = await loadFundingRequests(projectId);
  const all: FundingReportRow[] = requests.map((fr) => ({
    fundingRequestId: fr.id,
    displayNumber: fr.displayNumber,
    kind: fr.kind,
    stageId: fr.stageId,
    stageName: fr.stageName,
    issuedOn: toEatDate(fr.issuedAt),
    status: deriveFRStatus(fr),
    amountRequested: depositTarget(fr),
    amountDeposited: depositedTotal(fr),
    balance: depositOutstanding(fr),
  }));

  const filterOptions: FilterOptions = {
    stage: stageOptions(project),
    kind: presentInOrder(FR_KIND_ORDER, all.map((r) => r.kind)),
    status: presentInOrder(
      Object.values(FR_STATUS_SLUG),
      all.map((r) => FR_STATUS_SLUG[r.status]),
    ),
  };
  const f = sanitizeFilters("funding", filters, filterOptions);

  const rows = all.filter(
    (r) =>
      (!f.stage || r.stageId === f.stage) &&
      (!f.kind || r.kind === f.kind) &&
      (!f.status || FR_STATUS_SLUG[r.status] === f.status) &&
      inDateRange(r.issuedOn, f.from, f.to),
  );

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
    filterOptions,
    appliedFilters: f,
  };
}

// ---------------------------------------------------------------------------
// 6. Variation Report
// ---------------------------------------------------------------------------

export interface VariationReportRow {
  variationId: string;
  variationLabel: string;
  stageId: string;
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
  /** `requestedAt` as a calendar date in EAT (YYYY-MM-DD). */
  requestedOn: string | null;
}

export interface VariationReport {
  projectId: string;
  projectCode: string;
  projectName: string;
  rows: VariationReportRow[];
  totals: { additionalCostApproved: number };
}

export type FilteredVariationReport = VariationReport & ReportFilterFields;

/** Keyed on the joined stage ids so React `cache` can memoise it per request. */
const loadProjectVariations = cache(async (stageIds: string) =>
  (
    await Promise.all(
      stageIds
        .split(",")
        .filter(Boolean)
        .map((id) => listVariationsForStage(id)),
    )
  ).flat(),
);

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
  /** Stage · Approval status · Funding status · Requested date range. */
  filters: ReportFilters = {},
): Promise<FilteredVariationReport | null> {
  const project = await loadOverview(projectId);
  if (!project) return null;

  const variations = await loadProjectVariations(project.stages.map((s) => s.id).join(","));

  const all = variations.map((v) => {
    const row: VariationReportRow = {
      variationId: v.id,
      variationLabel: v.displayNumber ?? "Draft",
      stageId: v.stageId,
      stageName: v.stageName,
      taskDescription: v.taskDescription,
      scopeImpact: v.description,
      additionalCost: (v.materialImpact ?? 0) + (v.labourImpact ?? 0),
      approvalStatus: v.status,
      fundingStatus: variationFundingStatus(v),
      requestedAt: v.requestedAt,
      requestedOn: toEatDate(v.requestedAt),
    };
    return { v, row };
  });

  const filterOptions: FilterOptions = {
    stage: stageOptions(project),
    status: presentInOrder(VARIATION_STATUS_ORDER, all.map(({ row }) => row.approvalStatus)),
    funding: presentInOrder(
      Object.values(VARIATION_FUNDING_SLUG),
      all.map(({ row }) => VARIATION_FUNDING_SLUG[row.fundingStatus]),
    ),
  };
  const f = sanitizeFilters("variations", filters, filterOptions);

  const shown = all.filter(
    ({ row }) =>
      (!f.stage || row.stageId === f.stage) &&
      (!f.status || row.approvalStatus === f.status) &&
      (!f.funding || VARIATION_FUNDING_SLUG[row.fundingStatus] === f.funding) &&
      inDateRange(row.requestedOn, f.from, f.to),
  );

  const additionalCostApproved = shown
    .filter(({ v }) => v.status === "approved")
    .reduce((sum, { v }) => sum + (v.materialImpact ?? 0) + (v.labourImpact ?? 0), 0);

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    rows: shown.map(({ row }) => row),
    totals: { additionalCostApproved },
    filterOptions,
    appliedFilters: f,
  };
}
