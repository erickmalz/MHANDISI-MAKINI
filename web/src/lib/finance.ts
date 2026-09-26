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

/**
 * Money actually paid out of the project's funds: Paid Purchases + Labour
 * Payments + Petty Cash Expenses + Other Approved Commitments (the Financial
 * Summary's "Payments" column). The unpaid remainder is Total Committed − this.
 */
export function paymentsMade(f: StageFinancials): number {
  return f.paidPurchases + f.labourPayments + f.pettyCashExpenses + f.otherApprovedCommitments;
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

export interface ProjectFinancialTotals {
  clientDeposits: number;
  commitments: number;
  payments: number;
  remainingStageRequirement: number;
  availableFloat: number;
  /**
   * Σ max(0, per-stage Forecast Funding Requirement) — a negative (surplus)
   * stage never offsets a shortfall stage's own requirement, since a stage's
   * deposits are Funding-Request-scoped and cannot fund another stage's
   * shortfall (see `availableFloat`'s doc comment).
   */
  forecastShortfall: number;
}

/**
 * The project-wide roll-up of every stage's `StageFinancials` — the one
 * aggregation path both the Overview's "Project financial position" card and
 * the Financial Summary report read from (guidelines §51: "one authoritative
 * calculation path"). Every field but `forecastShortfall` is a plain sum
 * across stages; `forecastShortfall` is deliberately not `forecastFundingRequirement`
 * applied to the summed totals, to preserve the non-fungibility rule above.
 */
export function aggregateStageFinancials(
  stages: StageFinancials[],
): ProjectFinancialTotals {
  let clientDeposits = 0;
  let commitments = 0;
  let payments = 0;
  let remaining = 0;
  let floatSum = 0;
  let forecastShortfall = 0;

  for (const f of stages) {
    clientDeposits += f.clientDeposits;
    commitments += totalCommitted(f);
    payments += paymentsMade(f);
    remaining += remainingStageRequirement(f);
    floatSum += availableFloat(f);
    forecastShortfall += Math.max(0, forecastFundingRequirement(f));
  }

  return {
    clientDeposits,
    commitments,
    payments,
    remainingStageRequirement: remaining,
    availableFloat: floatSum,
    forecastShortfall,
  };
}

/**
 * Field-by-field sum of several stages' `StageFinancials` — the one roll-up
 * path (`@/lib/data/stage-financials`' `readProjectFinancials` returns it as
 * `totals`). Every linear figure (Available Float, Total Committed, the
 * variances) is correct when applied to the result; the Forecast Funding
 * Requirement is not — use `aggregateStageFinancials`' `forecastShortfall`,
 * which never lets a surplus stage offset a shortfall stage.
 */
export function sumStageFinancials(list: StageFinancials[]): StageFinancials {
  const total: StageFinancials = {
    clientDeposits: 0,
    openPurchaseCommitments: 0,
    paidPurchases: 0,
    openLabourCommitments: 0,
    labourPayments: 0,
    labourAgreementTotal: 0,
    materialEstimated: 0,
    materialEstimatedOriginal: 0,
    pettyCashExpenses: 0,
    otherApprovedCommitments: 0,
    remainingMaterial: 0,
    remainingLabour: 0,
    remainingFee: 0,
    remainingOtherApproved: 0,
    feeRecorded: 0,
    feeInvoiced: 0,
    feeReceived: 0,
    fundingRequestPending: false,
  };
  for (const f of list) {
    for (const key of Object.keys(total) as (keyof StageFinancials)[]) {
      if (key === "fundingRequestPending") {
        total.fundingRequestPending ||= f.fundingRequestPending;
      } else {
        total[key] += f[key];
      }
    }
  }
  return total;
}

export function formatTZS(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}TZS ${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}
