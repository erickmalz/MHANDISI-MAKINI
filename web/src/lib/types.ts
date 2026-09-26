export type FinancialHealth = "green" | "amber" | "red" | "blue";

export type StageStatus =
  | "Planned"
  | "Active"
  | "Awaiting Funding"
  | "On Hold"
  | "Ready for Closeout"
  | "Completed"
  | "Cancelled";

/**
 * Every figure here is per-stage. Available Float, Total Committed, and the
 * Financial Health Indicator are all derived from these via src/lib/finance.ts
 * — see .scratch/phase1-decisions/map.md tickets 01, 02, 07, 08, 09 for why
 * this shape differs from the original guidelines §6.1/§50.
 */
export interface StageFinancials {
  clientDeposits: number;
  openPurchaseCommitments: number;
  paidPurchases: number;
  /** = Outstanding Labour (§6.3): unpaid remainder of signed Labour Agreements. */
  openLabourCommitments: number;
  labourPayments: number;
  /**
   * Σ current labour agreement (`labourRevised ?? labourOriginal`) across the
   * stage's Tasks, unfloored (Phase 3 ticket 03 — Budget Variance Analysis).
   * The labour-side counterpart to `materialEstimated`; `@/lib/finance`'s
   * `labourVariance` reads it against `labourPayments`.
   */
  labourAgreementTotal: number;
  /**
   * Total Estimated Material Cost, stage-level (ticket 03 §3): Σ every
   * take-off line under every Task in the stage, using each line's current
   * figures (the revised pair once set, else the original pair) — includes
   * Variation-appended lines. `@/lib/finance`'s `materialVariance` reads it
   * against `paidPurchases`.
   */
  materialEstimated: number;
  /**
   * The take-off as first estimated: Σ original qty × original unit cost over
   * the same lines as `materialEstimated`, never the revised pair (the
   * Material Cost Report's "Estimated (original)" column).
   */
  materialEstimatedOriginal: number;
  pettyCashExpenses: number;
  otherApprovedCommitments: number;

  /** Positive terms of the Remaining Stage Requirement (§9). */
  remainingMaterial: number;
  remainingLabour: number;
  remainingFee: number;
  remainingOtherApproved: number;

  /**
   * The fee line on the stage's current *draft* Funding Request (base or
   * additional), before Issue raises it into a Fee Invoice. 0 once that
   * request is issued or if there is no draft — the figure hands off to
   * `feeInvoiced` rather than overlapping with it.
   */
  feeRecorded: number;
  feeInvoiced: number;
  feeReceived: number;

  /** A Funding Request is Issued and the client deposit is still pending. */
  fundingRequestPending: boolean;
}

export interface Stage {
  id: string;
  name: string;
  seq: number;
  status: StageStatus;
  progressPercent: number;
  financials: StageFinancials;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface ProjectAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
  /** The record the alert is about, per guidelines §33 ("Alerts should link directly to the record requiring action"). Omitted for alerts with no single record to jump to. */
  href?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  clientName: string;
  site: string;
  currency: "TZS";
  /**
   * The one open stage the engineer is working. Stored and editable; `null`
   * until the project has its first stage (a new Account starts empty, so a
   * freshly-created project has `stages: []` and no current stage).
   */
  currentStageId: string | null;
  stages: Stage[];
  alerts: ProjectAlert[];
}
