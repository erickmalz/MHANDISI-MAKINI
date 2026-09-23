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

/**
 * The Supervisor Fee Position — the supervisor's own earnings, a ledger of its
 * own. It is billed through Fee Invoices, never through client deposits, and is
 * shown apart from the project's client-funds figures. Fee Earned equals Fee
 * Received by definition (CONTEXT.md §37). The client still ultimately funds the
 * fee, so Remaining Fee stays inside the Forecast Funding Requirement above.
 *
 * Fee Recorded is the fee line on the stage's current draft Funding Request —
 * shown so the fee appears the moment it's entered, ahead of Issue raising the
 * Fee Invoice. It never overlaps with Invoiced: a request is either a draft
 * (Recorded) or issued (Invoiced), never both at once.
 */
export function supervisorFeePosition(f: StageFinancials) {
  return {
    recorded: f.feeRecorded,
    invoiced: f.feeInvoiced,
    received: f.feeReceived,
    earned: f.feeReceived,
    outstanding: f.feeInvoiced - f.feeReceived,
    remaining: f.remainingFee,
  };
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

/**
 * Material Variance (Phase 3 ticket 03 §3, `CONTEXT.md`): Total Estimated
 * Material Cost − Total Actual Material Cost, at the Stage level — no
 * per-line matching against Purchase Orders (there is no stable key between
 * a free-text take-off line and a free-text PO line). Positive = saving.
 */
export function materialVariance(f: StageFinancials): number {
  return f.materialEstimated - f.paidPurchases;
}

/**
 * Labour Variance — the labour-side counterpart, same granularity: the
 * stage's current labour agreement total against what has actually been
 * paid. Positive = saving.
 */
export function labourVariance(f: StageFinancials): number {
  return f.labourAgreementTotal - f.labourPayments;
}

/** The combined figure the Budget Variance card totals (ticket 03 §4). */
export function budgetVarianceTotal(f: StageFinancials): number {
  return materialVariance(f) + labourVariance(f);
}

export function formatTZS(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}TZS ${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}
