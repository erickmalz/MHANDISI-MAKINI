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
  pettyCashExpenses: number;
  otherApprovedCommitments: number;

  /** Positive terms of the Remaining Stage Requirement (§9). */
  remainingMaterial: number;
  remainingLabour: number;
  remainingFee: number;
  remainingOtherApproved: number;

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
}

export interface Project {
  id: string;
  code: string;
  name: string;
  clientName: string;
  site: string;
  currency: "TZS";
  currentStageId: string;
  stages: Stage[];
  alerts: ProjectAlert[];
}
