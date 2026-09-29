/**
 * The one table model every Report Export renders from — the PDF/JPG templates
 * (`@/lib/documents/report-export`) and the CSV (`./csv`) both read it, so the
 * three formats can never disagree about a row or a total (ticket "Export
 * formats and whether filters carry into them").
 *
 * Pure: takes the already-loaded (and already-filtered) report or statement,
 * the filter state and a translator, and returns labelled headlines + tables.
 * Money cells are plain numbers (whole shillings); the PDF formats them, the
 * CSV leaves them as numbers so a spreadsheet can sum them.
 */
import type { Locale } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/types";
import type { Translator } from "@/lib/i18n/translate";
import { formatDate } from "@/lib/format";
import type {
  FundingReport,
  LabourReport,
  MaterialCostReport,
  ProcurementReport,
  ProjectFinancialSummary,
  VariationReport,
} from "@/lib/data/reports";
import type { SubcontractorStatement, SupplierStatement } from "@/lib/data/statements";

import type { ReportFilterState, ReportKind } from "./filters";

export type ExportCell = string | number | null;

export interface ExportColumn {
  label: string;
  /** Money column: right-aligned, formatted as TZS in the PDF, a plain number in CSV. */
  money?: boolean;
}

export interface ExportTable {
  title: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
  /** The totals row, same width as `columns`; `null` when the table has none. */
  total: ExportCell[] | null;
}

export interface ExportHeadline {
  label: string;
  amount: number;
  /** Shown in the error colour (an outstanding balance, a shortfall). */
  alert?: boolean;
}

export interface ExportModel {
  headlines: ExportHeadline[];
  tables: ExportTable[];
}

/** A loaded report or statement, keyed by the contract's `ReportKind`. */
export type ReportExportData =
  | { kind: "financial-summary"; report: ProjectFinancialSummary }
  | { kind: "material-cost"; report: MaterialCostReport }
  | { kind: "procurement"; report: ProcurementReport }
  | { kind: "labour"; report: LabourReport }
  | { kind: "funding"; report: FundingReport }
  | { kind: "variations"; report: VariationReport }
  | { kind: "supplier-statement"; statement: SupplierStatement }
  | { kind: "subcontractor-statement"; statement: SubcontractorStatement };

export interface ModelContext {
  t: Translator;
  locale: Locale;
  filterState: ReportFilterState;
}

// --- Label maps (display value -> key; unknown values show as stored) -----

const STAGE_STATUS: Record<string, MessageKey> = {
  Planned: "funding.stageStatus.planned",
  Active: "funding.stageStatus.active",
  "Awaiting Funding": "funding.stageStatus.awaitingFunding",
  "On Hold": "funding.stageStatus.onHold",
  "Ready for Closeout": "funding.stageStatus.readyForCloseout",
  Completed: "funding.stageStatus.completed",
  Cancelled: "funding.stageStatus.cancelled",
};

const HEALTH: Record<string, MessageKey> = {
  green: "common.health.comfortable",
  amber: "common.health.tight",
  red: "common.health.underfunded",
  blue: "common.health.pending",
};

const PO_STATUS: Record<string, MessageKey> = {
  Planned: "procurement.status.planned",
  Ordered: "procurement.status.ordered",
  "Partially Delivered": "procurement.status.partiallyDelivered",
  Delivered: "procurement.status.delivered",
  "Partially Paid": "procurement.status.partiallyPaid",
  Paid: "procurement.status.paid",
  Cancelled: "procurement.status.cancelled",
  Closed: "procurement.status.closed",
};

const FR_STATUS: Record<string, MessageKey> = {
  Draft: "funding.status.draft",
  Issued: "funding.status.issued",
  "Partially Deposited": "funding.status.partiallyDeposited",
  Deposited: "funding.status.deposited",
  Superseded: "funding.status.superseded",
  Cancelled: "funding.status.cancelled",
  Closed: "funding.status.closed",
};

/** Labour report carries the English display label; statements carry the stored enum. */
const TASK_STATUS: Record<string, MessageKey> = {
  Planned: "reports.taskStatus.planned",
  Active: "reports.taskStatus.active",
  "On hold": "reports.taskStatus.onHold",
  Completed: "reports.taskStatus.completed",
  Cancelled: "reports.taskStatus.cancelled",
  planned: "reports.taskStatus.planned",
  active: "reports.taskStatus.active",
  on_hold: "reports.taskStatus.onHold",
  completed: "reports.taskStatus.completed",
  cancelled: "reports.taskStatus.cancelled",
};

const VARIATION_STATUS: Record<string, MessageKey> = {
  draft: "variations.status.draft",
  approved: "variations.status.approved",
  rejected: "variations.status.rejected",
  cancelled: "variations.status.cancelled",
};

const VARIATION_FUNDING: Record<string, MessageKey> = {
  "Not applicable": "reports.variations.fundingStatus.notApplicable",
  "Not linked to a funding request": "reports.variations.fundingStatus.notLinked",
  "Funding request pending": "reports.variations.fundingStatus.pending",
  Funded: "reports.variations.fundingStatus.funded",
};

function label(t: Translator, map: Record<string, MessageKey>, value: string): string {
  const key = map[value];
  return key ? t(key) : value;
}

const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);

/** The report / statement title, as shown on the export and its page. */
export function reportTitle(kind: ReportKind, t: Translator): string {
  switch (kind) {
    case "financial-summary":
      return t("reports.financialSummary.label");
    case "material-cost":
      return t("reports.materialCost.label");
    case "procurement":
      return t("reports.procurement.label");
    case "labour":
      return t("reports.labour.label");
    case "funding":
      return t("reports.funding.label");
    case "variations":
      return t("reports.variations.label");
    case "supplier-statement":
      return t("reportExport.supplierStatement");
    case "subcontractor-statement":
      return t("reportExport.subcontractorStatement");
  }
}

function totalLabel(ctx: ModelContext): string {
  return ctx.filterState.active.length > 0
    ? ctx.t("reportExport.totalFiltered")
    : ctx.t("reports.total");
}

// --- Per-kind models -------------------------------------------------------

function financialSummary(r: ProjectFinancialSummary, ctx: ModelContext): ExportModel {
  const { t } = ctx;
  const finer = ctx.filterState.finerFilterActive;
  const headlines: ExportHeadline[] = [
    { label: t("reports.financialSummary.fundingRequested"), amount: r.fundingRequested },
    { label: t("reports.financialSummary.fundingReceived"), amount: r.fundingReceived },
    { label: t("reports.financialSummary.feesInvoiced"), amount: r.feesInvoiced },
    { label: t("reports.financialSummary.feesReceived"), amount: r.feesReceived },
    { label: t("reports.financialSummary.feesOutstanding"), amount: r.feesOutstanding },
    { label: t("reports.financialSummary.commitments"), amount: r.commitments },
    { label: t("reports.financialSummary.payments"), amount: r.payments },
  ];
  // Per-stage-only figures follow the Stage filter only (ticket 02, Round 2).
  if (!finer) {
    headlines.push(
      { label: t("reports.financialSummary.availableFloat"), amount: r.availableFloat },
      {
        label: t("reports.financialSummary.forecastShortfall"),
        amount: r.forecastShortfall,
        alert: r.forecastShortfall > 0,
      },
    );
  }
  const rows = r.stages;
  return {
    headlines,
    tables: [
      {
        title: t("reports.financialSummary.caption"),
        columns: [
          { label: t("reports.financialSummary.columns.stage") },
          { label: t("reportExport.columns.status") },
          { label: t("reports.financialSummary.columns.health") },
          { label: t("reports.financialSummary.columns.clientDeposits"), money: true },
          { label: t("reports.financialSummary.columns.commitments"), money: true },
          { label: t("reports.financialSummary.columns.payments"), money: true },
          { label: t("reports.financialSummary.columns.availableFloat"), money: true },
          { label: t("reports.financialSummary.columns.forecastRequirement"), money: true },
        ],
        rows: rows.map((s) => [
          s.stageName,
          label(t, STAGE_STATUS, s.status),
          label(t, HEALTH, s.health),
          s.clientDeposits,
          s.commitments,
          s.payments,
          s.availableFloat,
          s.forecastFundingRequirement,
        ]),
        total: [
          totalLabel(ctx),
          null,
          null,
          sum(rows.map((s) => s.clientDeposits)),
          sum(rows.map((s) => s.commitments)),
          sum(rows.map((s) => s.payments)),
          sum(rows.map((s) => s.availableFloat)),
          // A surplus stage never offsets a shortfall stage (ticket 02).
          sum(rows.map((s) => Math.max(0, s.forecastFundingRequirement))),
        ],
      },
    ],
  };
}

function materialCost(r: MaterialCostReport, ctx: ModelContext): ExportModel {
  const { t } = ctx;
  return {
    headlines: [],
    tables: [
      {
        title: t("reports.materialCost.caption"),
        columns: [
          { label: t("reports.materialCost.columns.stage") },
          { label: t("reports.materialCost.columns.estimated"), money: true },
          { label: t("reports.materialCost.columns.revised"), money: true },
          { label: t("reports.materialCost.columns.actual"), money: true },
          { label: t("reports.materialCost.columns.variance"), money: true },
        ],
        rows: r.rows.map((row) => [
          row.stageName,
          row.estimatedOriginal,
          row.estimatedRevised,
          row.actual,
          row.variance,
        ]),
        total: [
          totalLabel(ctx),
          r.totals.estimatedOriginal,
          r.totals.estimatedRevised,
          r.totals.actual,
          r.totals.variance,
        ],
      },
    ],
  };
}

function procurement(r: ProcurementReport, ctx: ModelContext): ExportModel {
  const { t } = ctx;
  const headlines: ExportHeadline[] = [];
  // "Required" exists per stage only — hidden under a supplier/status/date filter.
  if (!ctx.filterState.finerFilterActive) {
    headlines.push({ label: t("reports.procurement.required"), amount: r.required });
  }
  headlines.push(
    { label: t("reports.procurement.ordered"), amount: r.totals.ordered },
    { label: t("reports.procurement.delivered"), amount: r.totals.delivered },
    { label: t("reports.procurement.paid"), amount: r.totals.paid },
    {
      label: t("reports.procurement.outstanding"),
      amount: r.totals.outstanding,
      alert: r.totals.outstanding > 0,
    },
  );
  return {
    headlines,
    tables: [
      {
        title: t("reports.procurement.caption"),
        columns: [
          { label: t("reports.procurement.columns.order") },
          { label: t("reportExport.columns.status") },
          { label: t("reports.procurement.columns.stage") },
          { label: t("reports.procurement.columns.supplier") },
          { label: t("reports.procurement.columns.ordered"), money: true },
          { label: t("reports.procurement.columns.delivered"), money: true },
          { label: t("reports.procurement.columns.paid"), money: true },
          { label: t("reports.procurement.columns.outstanding"), money: true },
        ],
        rows: r.rows.map((row) => [
          row.displayNumber ?? t("procurement.list.draft"),
          label(t, PO_STATUS, row.status),
          row.stageName,
          row.supplierName,
          row.ordered,
          row.delivered,
          row.paid,
          row.outstanding,
        ]),
        total: [
          totalLabel(ctx),
          null,
          null,
          null,
          r.totals.ordered,
          r.totals.delivered,
          r.totals.paid,
          r.totals.outstanding,
        ],
      },
    ],
  };
}

function labour(r: LabourReport, ctx: ModelContext): ExportModel {
  const { t } = ctx;
  return {
    headlines: [],
    tables: [
      {
        title: t("reports.labour.caption"),
        columns: [
          { label: t("reports.labour.columns.task") },
          { label: t("reportExport.columns.status") },
          { label: t("reports.labour.columns.subcontractor") },
          { label: t("reports.labour.columns.stage") },
          { label: t("reports.labour.columns.agreed"), money: true },
          { label: t("reports.labour.columns.revised"), money: true },
          { label: t("reports.labour.columns.paid"), money: true },
          { label: t("reports.labour.columns.outstanding"), money: true },
        ],
        rows: r.rows.map((row) => [
          row.taskDescription,
          label(t, TASK_STATUS, row.status),
          row.subcontractorName,
          row.stageName,
          row.agreed,
          row.revised,
          row.paid,
          row.outstanding,
        ]),
        total: [
          totalLabel(ctx),
          null,
          null,
          null,
          r.totals.agreed,
          r.totals.revised,
          r.totals.paid,
          r.totals.outstanding,
        ],
      },
    ],
  };
}

function funding(r: FundingReport, ctx: ModelContext): ExportModel {
  const { t } = ctx;
  return {
    headlines: [
      { label: t("reports.funding.requested"), amount: r.totals.requested },
      { label: t("reports.funding.deposited"), amount: r.totals.deposited },
      {
        label: t("reports.funding.balance"),
        amount: r.totals.balance,
        alert: r.totals.balance > 0,
      },
    ],
    tables: [
      {
        title: t("reports.funding.caption"),
        columns: [
          { label: t("reports.funding.columns.request") },
          { label: t("reportExport.columns.kind") },
          { label: t("reportExport.columns.status") },
          { label: t("reports.funding.columns.stage") },
          { label: t("reports.funding.columns.requested"), money: true },
          { label: t("reports.funding.columns.deposited"), money: true },
          { label: t("reports.funding.columns.balance"), money: true },
        ],
        rows: r.rows.map((row) => [
          row.displayNumber ?? t("funding.list.draft"),
          row.kind === "additional" ? t("reportExport.kind.additional") : t("reportExport.kind.base"),
          label(t, FR_STATUS, row.status),
          row.stageName,
          row.amountRequested,
          row.amountDeposited,
          row.balance,
        ]),
        total: [
          totalLabel(ctx),
          null,
          null,
          null,
          r.totals.requested,
          r.totals.deposited,
          r.totals.balance,
        ],
      },
    ],
  };
}

function variations(r: VariationReport, ctx: ModelContext): ExportModel {
  const { t, locale } = ctx;
  return {
    headlines: [
      { label: t("reports.variations.totalAdditional"), amount: r.totals.additionalCostApproved },
    ],
    tables: [
      {
        title: t("reports.variations.caption"),
        columns: [
          { label: t("reports.variations.columns.variation") },
          { label: t("reportExport.columns.stage") },
          { label: t("reportExport.columns.description") },
          { label: t("reports.variations.columns.scopeImpact") },
          { label: t("reports.variations.columns.approvalStatus") },
          { label: t("reports.variations.columns.fundingStatus") },
          { label: t("reportExport.columns.date") },
          { label: t("reports.variations.columns.additionalCost"), money: true },
        ],
        rows: r.rows.map((row) => [
          row.variationLabel,
          row.stageName,
          row.taskDescription,
          row.scopeImpact,
          label(t, VARIATION_STATUS, row.approvalStatus),
          label(t, VARIATION_FUNDING, row.fundingStatus),
          formatDate(row.requestedAt, locale),
          row.additionalCost,
        ]),
        total: [
          t("reports.variations.totalAdditional"),
          null,
          null,
          null,
          null,
          null,
          null,
          r.totals.additionalCostApproved,
        ],
      },
    ],
  };
}

function outstandingLabel(ctx: ModelContext, fallback: MessageKey): string {
  return ctx.filterState.active.length > 0
    ? ctx.t("reportExport.outstandingFiltered")
    : ctx.t(fallback);
}

function supplierStatement(s: SupplierStatement, ctx: ModelContext): ExportModel {
  const { t, locale } = ctx;
  const live = s.orders.filter((o) => o.status !== "cancelled");
  return {
    headlines: [
      {
        label: outstandingLabel(ctx, "suppliers.statement.outstanding"),
        amount: s.outstandingBalance,
        alert: s.outstandingBalance > 0,
      },
    ],
    tables: [
      {
        title: t("suppliers.statement.orders"),
        columns: [
          { label: t("reports.procurement.columns.order") },
          { label: t("reportExport.columns.date") },
          { label: t("reportExport.columns.project") },
          { label: t("reportExport.columns.stage") },
          { label: t("reportExport.columns.amount"), money: true },
        ],
        rows: s.orders.map((o) => [
          o.status === "cancelled"
            ? t("reportExport.ledger.cancelled", {
                type: o.displayNumber ?? t("suppliers.statement.draft"),
              })
            : (o.displayNumber ?? t("suppliers.statement.draft")),
          formatDate(o.createdAt, locale),
          o.projectName,
          o.stageName,
          o.orderedTotal,
        ]),
        total: [totalLabel(ctx), null, null, null, sum(live.map((o) => o.orderedTotal))],
      },
      {
        title: t("suppliers.statement.payments"),
        columns: [
          { label: t("reportExport.columns.date") },
          { label: t("reports.procurement.columns.order") },
          { label: t("reportExport.columns.project") },
          { label: t("reportExport.columns.reference") },
          { label: t("reportExport.columns.amount"), money: true },
        ],
        rows: s.payments.map((p) => [
          formatDate(p.paidOn, locale),
          p.displayNumber ?? t("suppliers.statement.draft"),
          p.projectName,
          p.reference,
          p.amount,
        ]),
        total: [totalLabel(ctx), null, null, null, sum(s.payments.map((p) => p.amount))],
      },
    ],
  };
}

function subcontractorStatement(s: SubcontractorStatement, ctx: ModelContext): ExportModel {
  const { t, locale } = ctx;
  const live = s.tasks.filter((x) => x.status !== "cancelled");
  return {
    headlines: [
      {
        label: outstandingLabel(ctx, "subcontractors.statement.outstanding"),
        amount: s.outstandingBalance,
        alert: s.outstandingBalance > 0,
      },
    ],
    tables: [
      {
        title: t("subcontractors.statement.agreedLabour"),
        columns: [
          { label: t("reports.labour.columns.task") },
          { label: t("reportExport.columns.status") },
          { label: t("reportExport.columns.project") },
          { label: t("reportExport.columns.stage") },
          { label: t("reports.labour.columns.agreed"), money: true },
        ],
        rows: s.tasks.map((x) => [
          x.description,
          label(t, TASK_STATUS, x.status),
          x.projectName,
          x.stageName,
          x.agreedAmount,
        ]),
        total: [totalLabel(ctx), null, null, null, sum(live.map((x) => x.agreedAmount))],
      },
      {
        title: t("subcontractors.statement.payments"),
        columns: [
          { label: t("reportExport.columns.date") },
          { label: t("reports.labour.columns.task") },
          { label: t("reportExport.columns.project") },
          { label: t("reportExport.columns.reference") },
          { label: t("reportExport.columns.amount"), money: true },
        ],
        rows: s.payments.map((p) => [
          formatDate(p.paidOn, locale),
          p.taskDescription,
          p.projectName,
          p.reference,
          p.amount,
        ]),
        total: [totalLabel(ctx), null, null, null, sum(s.payments.map((p) => p.amount))],
      },
    ],
  };
}

/** Headlines + tables for one loaded report or statement. */
export function buildExportModel(data: ReportExportData, ctx: ModelContext): ExportModel {
  switch (data.kind) {
    case "financial-summary":
      return financialSummary(data.report, ctx);
    case "material-cost":
      return materialCost(data.report, ctx);
    case "procurement":
      return procurement(data.report, ctx);
    case "labour":
      return labour(data.report, ctx);
    case "funding":
      return funding(data.report, ctx);
    case "variations":
      return variations(data.report, ctx);
    case "supplier-statement":
      return supplierStatement(data.statement, ctx);
    case "subcontractor-statement":
      return subcontractorStatement(data.statement, ctx);
  }
}

// --- Statement ledger (CSV only) --------------------------------------------

/**
 * A Statement as one date-sorted ledger — the shape a counterparty's own
 * bookkeeping expects (ticket "Do the Supplier and Subcontractor Statements get
 * the report toolbar?", Round 5): Type, Date, Project, Stage, Reference,
 * Charged, Paid, then a Total row and the Outstanding balance. Dates are ISO
 * (YYYY-MM-DD) so a spreadsheet sorts them. A cancelled order / task is listed
 * but charges nothing. Task agreements carry no date of their own, so they sort
 * first with the Date cell empty.
 */
export function buildStatementLedger(
  data: Extract<ReportExportData, { kind: "supplier-statement" | "subcontractor-statement" }>,
  ctx: ModelContext,
): ExportTable {
  const { t } = ctx;
  type Entry = { date: string; cells: ExportCell[] };
  const entries: Entry[] = [];
  const isoDay = (v: string) => (v ? v.slice(0, 10) : "");

  if (data.kind === "supplier-statement") {
    const stageOf = new Map(data.statement.orders.map((o) => [o.purchaseOrderId, o.stageName]));
    for (const o of data.statement.orders) {
      const cancelled = o.status === "cancelled";
      const type = t("reportExport.ledger.order");
      entries.push({
        date: isoDay(o.orderedOn),
        cells: [
          cancelled ? t("reportExport.ledger.cancelled", { type }) : type,
          isoDay(o.orderedOn),
          o.projectName,
          o.stageName,
          o.displayNumber ?? t("suppliers.statement.draft"),
          cancelled ? null : o.orderedTotal,
          null,
        ],
      });
    }
    for (const p of data.statement.payments) {
      entries.push({
        date: isoDay(p.paidOn),
        cells: [
          t("reportExport.ledger.payment"),
          isoDay(p.paidOn),
          p.projectName,
          stageOf.get(p.purchaseOrderId) ?? null,
          [p.displayNumber, p.reference].filter(Boolean).join(" · ") || null,
          null,
          p.amount,
        ],
      });
    }
  } else {
    const stageOf = new Map(data.statement.tasks.map((x) => [x.taskId, x.stageName]));
    for (const x of data.statement.tasks) {
      const cancelled = x.status === "cancelled";
      const type = t("reportExport.ledger.agreement");
      const agreedOn = isoDay(x.agreedOn);
      entries.push({
        date: agreedOn,
        cells: [
          cancelled ? t("reportExport.ledger.cancelled", { type }) : type,
          agreedOn,
          x.projectName,
          x.stageName,
          x.description,
          cancelled ? null : x.agreedAmount,
          null,
        ],
      });
    }
    for (const p of data.statement.payments) {
      entries.push({
        date: isoDay(p.paidOn),
        cells: [
          t("reportExport.ledger.payment"),
          isoDay(p.paidOn),
          p.projectName,
          stageOf.get(p.taskId) ?? null,
          [p.taskDescription, p.reference].filter(Boolean).join(" · ") || null,
          null,
          p.amount,
        ],
      });
    }
  }

  // Stable sort: undated entries first, then by ISO date.
  entries.sort((a, b) => a.date.localeCompare(b.date));
  const rows = entries.map((e) => e.cells);
  const charged = sum(rows.map((r) => (typeof r[5] === "number" ? r[5] : 0)));
  const paid = sum(rows.map((r) => (typeof r[6] === "number" ? r[6] : 0)));

  return {
    title: reportTitle(data.kind, t),
    columns: [
      { label: t("reportExport.columns.type") },
      { label: t("reportExport.columns.date") },
      { label: t("reportExport.columns.project") },
      { label: t("reportExport.columns.stage") },
      { label: t("reportExport.columns.reference") },
      { label: t("reportExport.columns.charged"), money: true },
      { label: t("reportExport.columns.paid"), money: true },
    ],
    rows: [
      ...rows,
      [t("reportExport.ledger.total"), null, null, null, null, charged, paid],
    ],
    // The outstanding balance is the DAL's own figure (per order/task,
    // floored at 0, cancelled excluded) — not Charged − Paid, which a
    // payment against a cancelled order would distort.
    total: [
      t("reportExport.ledger.outstanding"),
      null,
      null,
      null,
      null,
      data.statement.outstandingBalance,
      null,
    ],
  };
}
