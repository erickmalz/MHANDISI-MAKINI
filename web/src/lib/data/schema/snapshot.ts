/**
 * The frozen content an Issued Funding Request, Fee Invoice or Purchase Order
 * renders from (multi-tenancy ticket 09 §6, ticket 10 §3).
 *
 * Written once, in the atomic Issue transaction, into the `document_snapshot`
 * JSONB column. The renderer reads *only* this for transactional content — never
 * the live `projects` / `suppliers` / `*_lines` tables — so a later register
 * edit or a `finance.ts` change can never rewrite a document that was already
 * issued. Two things are deliberately *not* in here:
 *
 *  - **The letterhead identity** (the Engineer's business name and phone). It
 *    renders from the current Account profile, because a corrected phone number
 *    is the Engineer representing themselves, not a term of the deal (§3).
 *  - **The lifecycle stamp** (`SUPERSEDED` / `CANCELLED` / `PAID — {date}`). The
 *    stamp reflects the record's state *now*, which changes after Issue, so the
 *    document getter derives it from the live row and passes it to the template
 *    alongside this snapshot.
 *
 * Slice 2.7 tightened this from the loose shape the schema first committed to
 * into a `kind`-discriminated union carrying every field ticket 10 §7 lists.
 */

export interface DocumentSnapshotLine {
  /** The line's name — a material item, a labour package, a fee description. */
  label: string;
  description?: string;
  /** Quantity as a display string (kept verbatim from entry, e.g. "12.5"). */
  qty?: string;
  unit?: string;
  unitCost?: number;
  amount: number;
}

export interface DocumentSnapshotSection {
  title: string;
  lines: DocumentSnapshotLine[];
  subtotal: number;
}

interface DocumentSnapshotBase {
  /** The frozen human-facing number, e.g. "FR-PRJ-2026-001-004 v2". */
  displayNumber: string;
  /** ISO date (YYYY-MM-DD) the record was Issued. */
  issuedOn: string;
  projectName: string;
  projectCode: string;
  /** Client (FR / Fee Invoice) or Supplier (PO) name, resolved at Issue. */
  counterpartyName: string;
  site: string;
  stageName: string;
  sections: DocumentSnapshotSection[];
  total: number;
  notes?: string;
  paymentInstructions?: string;
}

/**
 * A client-facing Funding Request. `total` is the **deposit target** (material +
 * labour + other); the supervision fee is a display-only section and is billed
 * through the Fee Invoice, never drawn from deposits (Phase 1 Fee Collection
 * Method).
 */
export interface FundingRequestSnapshot extends DocumentSnapshotBase {
  kind: "funding_request";
  /** The supervision fee shown on the request for transparency. */
  feeAmount: number;
  /** Present on a superseding version — the number it replaces and why. */
  supersedes?: { displayNumber: string; reason: string };
}

/**
 * A client-facing Fee Invoice. Raised inside the Funding Request Issue
 * transaction; `total` is the fee amount (or, for `isDelta`, only the increase).
 */
export interface FeeInvoiceSnapshot extends DocumentSnapshotBase {
  kind: "fee_invoice";
  /** The Funding Request version this fee is for, e.g. "FR-PRJ-2026-001-004 v2". */
  fundingRequestNumber: string;
  /** How the fee was worked out — the template composes the human sentence. */
  feeBasis: "fixed" | "percent";
  feePercent?: number;
  basisValue?: number;
  /** A follow-up invoice for the increase on a superseding version. */
  isDelta: boolean;
  /** When `isDelta`: the Fee Invoice number this one follows up. */
  parentNumber?: string;
  /**
   * Present once the amount has been corrected after Issue — what was first
   * billed, the ISO date of the correction and the recorded reason.
   */
  correction?: { originalAmount: number; correctedOn: string; reason: string };
}

/**
 * A supplier-facing Purchase Order — the order as issued, not a live tracker.
 * The Commitment State and delivered / paid progress are deliberately absent
 * (ticket 10 §7).
 */
export interface PurchaseOrderSnapshot extends DocumentSnapshotBase {
  kind: "purchase_order";
  /** Supplier phone frozen from the register at Issue, if the register had one. */
  supplierContact?: string;
  /** ISO date (YYYY-MM-DD), if an expected delivery date was set. */
  expectedDeliveryOn?: string;
}

/**
 * One material item's on-hand balance in the project-wide Material Stock
 * ledger (`src/lib/data/material-stock.ts`, Phase 3 ticket 06), frozen at the
 * moment this Stage closed — before any post-closeout "Carry Forward /
 * Written Off" resolution touches the ledger. Same shape as
 * `StockBalance`, kept independent here since the frozen copy must never
 * change when the live ledger later does.
 */
export interface StageCloseoutMaterialStockLine {
  itemKey: string;
  unit: string;
  qty: number;
}

/**
 * The Stage Closeout Report (guidelines §38, §50; Phase 4 ticket 03,
 * `.scratch/phase4/issues/03-stage-closeout-report.md`). Frozen inside the
 * existing `closeStage` transaction (`src/lib/data/stage-closeout.ts`) — the
 * same atomic moment `stages.status` flips to `completed` — from figures the
 * Stage Closeout screen already computes and shows read-only before the
 * Engineer clicks Close Stage: `@/lib/finance`'s Budget Variance figures
 * (Phase 3 ticket 03), the Supervisor Fee Position, the Client Funds
 * forecast, and the project-wide Material Stock surplus (Phase 3 ticket 06).
 *
 * `counterpartyName` (from `DocumentSnapshotBase`) holds the Project's
 * client name — this report has no Client/Supplier party the way a Funding
 * Request or Purchase Order does, but it is still a record "a client or the
 * supervisor's own records might reference later" (ticket 03's own
 * reasoning), so the client is named the same way every other document
 * names its counterparty. `sections`/`total` (also from the base) carry the
 * Material/Labour Budget Variance breakdown, mirroring the on-screen
 * `BudgetVarianceCard` (`total` = the Combined Budget Variance). `notes`
 * (base, optional) freezes the Stage's own free-text `notes` column — the
 * closest live field to §38's "unresolved notes" line; there is no separate
 * notes-taking step in the Stage Closeout workflow.
 *
 * The `*Reconciled` booleans match §50's `stage_closeouts` column list
 * verbatim, alongside the actual figures behind each one (ticket 03's answer:
 * "plus the actual figures, not just booleans"). `materialsReconciled` /
 * `labourReconciled` are always `true` by construction — two of Stage
 * Closeout's four hard gates (no `ordered` Purchase Order; zero Open Labour
 * Commitments, `src/lib/stage-closeout.ts`) already guarantee this for any
 * Stage that reaches `completed`, so `closeStage` writes the boolean rather
 * than re-deriving it. `feeReconciled` / `clientFundsReconciled` are **not**
 * gates (Phase 1 decision 03: fee outstanding never blocks closeout) and so
 * reflect the actual state at close, which may be `false`.
 * `documentsReconciled` is always `true` — the Documents group on the
 * Closeout screen is purely informational with no live check behind it (every
 * Issued record is already immutable by construction); recorded as a flag
 * for §50 symmetry, not because anything is being verified.
 */
export interface StageCloseoutReportSnapshot extends DocumentSnapshotBase {
  kind: "stage_closeout_report";

  /**
   * The Financial Reconciliation Engine's ("Run Financial Check", Phase 3
   * ticket 04) rollup at the moment of closing — `critical` if any check was
   * Critical, else `warning` if any was Warning, else `passed`. Purely
   * informational (guidelines §34: "informational, not an accounting
   * certification"); never a closeout gate.
   */
  financialCheckStatus: "passed" | "warning" | "critical";

  materialsReconciled: boolean;
  labourReconciled: boolean;
  documentsReconciled: boolean;
  feeReconciled: boolean;
  clientFundsReconciled: boolean;

  /** Σ Approved Estimate (material + labour) for the stage — the Budget Variance card's "Estimated"/"Agreement" pair, combined. */
  stageBudget: number;
  /** Σ actual spend (paid purchases + labour payments) for the stage. */
  actualCost: number;

  materialEstimated: number;
  materialActual: number;
  materialVariance: number;
  /** Σ Material Variance across every stage of the *project* (`materialVariance` over `@/lib/data/stage-financials`' project `totals`) — the Budget Variance card's own second figure, frozen alongside the stage-level one. */
  accumulatedMaterialVariance: number;

  labourAgreement: number;
  labourActual: number;
  labourVariance: number;

  feeInvoiced: number;
  feeReceived: number;
  feeOutstanding: number;

  clientDeposits: number;
  /** Positive = a shortfall was still open at close; zero/negative = funding was adequate (`@/lib/finance`'s `forecastFundingRequirement`). */
  forecastFundingRequirement: number;

  /** Project-wide on-site surplus at the moment of closing, not yet resolved to Carried Forward / Written Off. */
  materialStockSurplus: StageCloseoutMaterialStockLine[];
}

/**
 * The Project Closeout Report (Phase 4 ticket 04) — a project-wide
 * reconciliation frozen at `completeProject`, guidelines §37's field list.
 * Assembled by **summing already-computed per-stage figures**
 * (`@/lib/finance` applied to the project's stages' `StageFinancials`, added
 * elementwise — see `@/lib/data/project-closeout.ts`), not a new project-wide
 * calculation engine.
 *
 * The base `sections`/`total` fields (designed for a priced line-item
 * document) are repurposed here for the four genuinely itemised-and-summed
 * groups this report has — Approved Variations, Supplier Balances,
 * Subcontractor Balances, Outstanding Documents — via the same generic
 * `SectionTable` the other three documents already render with; `total` is
 * `finalProjectVariance`. `stageName` (singular, designed for a stage-scoped
 * document) holds a short "{N} stages" summary instead — there is no single
 * stage to name at project scope.
 *
 * The remaining single derived figures (not itemised lists, so not a good
 * fit for `sections`) are their own typed fields below.
 */
export interface ProjectCloseoutReportSnapshot extends DocumentSnapshotBase {
  kind: "project_closeout_report";
  stageCount: number;
  /** Σ `clientDeposits` across every stage — guidelines §37 "Total client funding". */
  totalClientFunding: number;
  /** `availableFloat` applied to the project-wide summed figures — "Remaining client float". */
  remainingClientFloat: number;
  /** Σ (`openPurchaseCommitments` + `paidPurchases`) — "Total material commitments" (ordered, open + paid). */
  totalMaterialCommitments: number;
  /** Σ `paidPurchases` — "Total actual material cost". */
  totalActualMaterialCost: number;
  /** Σ `labourAgreementTotal` — "Total labour agreements". */
  totalLabourAgreements: number;
  /** Σ `labourPayments` — "Total labour paid". */
  totalLabourPaid: number;
  /** Σ `feeInvoiced` — "Total fees" (billed). Kept alongside `totalFeesReceived` for clarity. */
  totalFeesInvoiced: number;
  totalFeesReceived: number;
  /** `materialVariance` + `labourVariance` on the project-wide summed figures — "Final project variance". Mirrors `total`. */
  finalProjectVariance: number;
}

export type DocumentSnapshot =
  | FundingRequestSnapshot
  | FeeInvoiceSnapshot
  | PurchaseOrderSnapshot
  | StageCloseoutReportSnapshot
  | ProjectCloseoutReportSnapshot;
