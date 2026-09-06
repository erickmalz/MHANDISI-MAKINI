import type { FinancialHealth, StageFinancials } from "./types";

/**
 * The single authoritative calculation path for every derived financial
 * figure (guidelines §51: "one authoritative calculation path"). Every
 * screen must read these functions rather than recomputing formulas inline.
 *
 * Formulas here are the wayfinder-corrected versions — see
 * .scratch/phase1-decisions/map.md and issues/07, 08 for the reasoning.
 */

export function availableFloat(f: StageFinancials): number {
  return (
    f.clientDeposits -
    f.openPurchaseCommitments -
    f.paidPurchases -
    f.openLabourCommitments -
    f.labourPayments -
    f.pettyCashExpenses -
    f.otherApprovedCommitments
  );
}

/** Total Committed (§7 dashboard) = Client Deposits − Available Float. */
export function totalCommitted(f: StageFinancials): number {
  return (
    f.openPurchaseCommitments +
    f.paidPurchases +
    f.openLabourCommitments +
    f.labourPayments +
    f.pettyCashExpenses +
    f.otherApprovedCommitments
  );
}

/** Remaining Material + Remaining Labour + Remaining Fee + Remaining Other (§9's positive terms). */
export function remainingStageRequirement(f: StageFinancials): number {
  return (
    f.remainingMaterial +
    f.remainingLabour +
    f.remainingFee +
    f.remainingOtherApproved
  );
}

/** Positive = Additional Funding Required. Zero or negative = Current Funding Adequate. */
export function forecastFundingRequirement(f: StageFinancials): number {
  return remainingStageRequirement(f) - availableFloat(f);
}

/** Fee Outstanding = Fee Invoiced − Fee Received (a plain AR figure, ticket 03). */
export function feeOutstanding(f: StageFinancials): number {
  return f.feeInvoiced - f.feeReceived;
}

/** Green/Amber/Red buffer (ticket 08): 20% headroom over the Remaining Stage Requirement. */
export const HEALTH_BUFFER = 1.2;

export function financialHealth(f: StageFinancials): FinancialHealth {
  if (f.fundingRequestPending) return "blue";

  const float = availableFloat(f);
  const ffr = forecastFundingRequirement(f);
  if (float < 0 || ffr > 0) return "red";

  const rsr = remainingStageRequirement(f);
  if (float >= rsr * HEALTH_BUFFER) return "green";
  return "amber";
}

export function formatTZS(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}TZS ${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}
