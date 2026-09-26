import { describe, expect, it } from "vitest";

import { aggregateStageFinancials, forecastFundingRequirement } from "@/lib/finance";
import type { StageFinancials } from "@/lib/types";

const ZERO: StageFinancials = {
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
} as StageFinancials;

const fin = (over: Partial<StageFinancials>): StageFinancials => ({ ...ZERO, ...over });

describe("aggregateStageFinancials", () => {
  it("sums client deposits, commitments, payments, remaining requirement and float across stages", () => {
    const shortfallStage = fin({
      clientDeposits: 1_000,
      paidPurchases: 200,
      labourPayments: 100,
      pettyCashExpenses: 50,
      openPurchaseCommitments: 150,
      openLabourCommitments: 50,
      otherApprovedCommitments: 25,
      remainingMaterial: 300,
      remainingLabour: 200,
      remainingFee: 50,
      remainingOtherApproved: 25,
    });
    const surplusStage = fin({ clientDeposits: 1_000, paidPurchases: 300, remainingMaterial: 200 });

    const totals = aggregateStageFinancials([shortfallStage, surplusStage]);

    expect(totals.clientDeposits).toBe(2_000);
    expect(totals.commitments).toBe(875);
    expect(totals.payments).toBe(675);
    expect(totals.remainingStageRequirement).toBe(775);
    expect(totals.availableFloat).toBe(1_125);
  });

  it("does not let a surplus stage offset a shortfall stage's own requirement", () => {
    // A stage short by 150, and a stage in 500 surplus.
    const shortfallStage = fin({
      clientDeposits: 1_000,
      paidPurchases: 200,
      labourPayments: 100,
      pettyCashExpenses: 50,
      openPurchaseCommitments: 150,
      openLabourCommitments: 50,
      otherApprovedCommitments: 25,
      remainingMaterial: 300,
      remainingLabour: 200,
      remainingFee: 50,
      remainingOtherApproved: 25,
    });
    const surplusStage = fin({ clientDeposits: 1_000, paidPurchases: 300, remainingMaterial: 200 });

    expect(forecastFundingRequirement(shortfallStage)).toBe(150);
    expect(forecastFundingRequirement(surplusStage)).toBe(-500);

    const totals = aggregateStageFinancials([shortfallStage, surplusStage]);

    // Not the -350 a project-wide forecast would give (775 remaining − 1,125
    // float): the surplus stage's deposit is scoped to its own Funding
    // Requests and can't be lent to the shortfall stage.
    expect(totals.forecastShortfall).toBe(150);
  });

  it("is all zero for a project with no stages yet", () => {
    const totals = aggregateStageFinancials([]);
    expect(totals.clientDeposits).toBe(0);
    expect(totals.commitments).toBe(0);
    expect(totals.payments).toBe(0);
    expect(totals.remainingStageRequirement).toBe(0);
    expect(totals.availableFloat).toBe(0);
    expect(totals.forecastShortfall).toBe(0);
  });
});
