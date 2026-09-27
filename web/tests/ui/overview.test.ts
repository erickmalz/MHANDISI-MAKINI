import { describe, expect, it } from "vitest";

import {
  sortAlertsBySeverity,
  statusSentence,
} from "@/app/(app)/projects/[id]/_components/overview";
import { financialHealth } from "@/lib/finance";
import { catalogues } from "@/lib/i18n/catalogues";
import { createT } from "@/lib/i18n/translate";
import type { ProjectAlert, StageFinancials } from "@/lib/types";

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
const alert = (id: string, severity: ProjectAlert["severity"]): ProjectAlert => ({
  id,
  severity,
  message: id,
});

const t = createT("en", catalogues.en);
const tSw = createT("sw", catalogues.sw);

describe("statusSentence", () => {
  it("says how much a red stage is short by", () => {
    const f = fin({ clientDeposits: 1_000, paidPurchases: 400, remainingMaterial: 900 });
    expect(financialHealth(f)).toBe("red");
    expect(statusSentence(f, "red", t)).toBe(
      "Underfunded by TZS 300. The remaining work costs more than the Available Float.",
    );
  });

  it("says commitments exceed the deposit when the float is negative", () => {
    const f = fin({ clientDeposits: 100, paidPurchases: 250 });
    expect(statusSentence(f, "red", t)).toBe(
      "Commitments are TZS 150 more than the client has deposited.",
    );
  });

  it("names the margin for amber and green", () => {
    const amber = fin({ clientDeposits: 1_000, remainingMaterial: 900 });
    expect(financialHealth(amber)).toBe("amber");
    expect(statusSentence(amber, "amber", t)).toContain("less than 20% to spare");
    const green = fin({ clientDeposits: 1_000, remainingMaterial: 500 });
    expect(financialHealth(green)).toBe("green");
    expect(statusSentence(green, "green", t)).toContain("at least 20% to spare");
  });

  it("mentions a pending funding request, and the shortfall only if there is one", () => {
    expect(statusSentence(fin({ fundingRequestPending: true }), "blue", t)).toBe(
      "A funding request is with the client.",
    );
    const short = fin({ fundingRequestPending: true, clientDeposits: 100, remainingMaterial: 400 });
    expect(statusSentence(short, "blue", t)).toBe(
      "A funding request is with the client. The forecast shortfall is TZS 300.",
    );
  });
});

describe("statusSentence in Kiswahili", () => {
  it("keeps the figures and reads in Kiswahili", () => {
    const f = fin({ clientDeposits: 1_000, paidPurchases: 400, remainingMaterial: 900 });
    expect(statusSentence(f, "red", tSw)).toBe(
      "Fedha hazitoshi kwa TZS 300. Kazi iliyosalia inagharimu zaidi ya fedha zinazopatikana.",
    );
    expect(statusSentence(fin({ fundingRequestPending: true }), "blue", tSw)).toBe(
      "Ombi la fedha liko kwa mteja.",
    );
  });
});

describe("alert ordering", () => {
  it("puts critical first, then warning, then info, keeping order within a severity", () => {
    const sorted = sortAlertsBySeverity([
      alert("i1", "info"),
      alert("w1", "warning"),
      alert("c1", "critical"),
      alert("w2", "warning"),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(["c1", "w1", "w2", "i1"]);
  });

  it("does not mutate its input and returns nothing for no alerts", () => {
    const input = [alert("i1", "info"), alert("c1", "critical")];
    sortAlertsBySeverity(input);
    expect(input.map((a) => a.id)).toEqual(["i1", "c1"]);
    expect(sortAlertsBySeverity([])).toEqual([]);
  });
});
