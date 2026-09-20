import { describe, expect, it } from "vitest";

import { cleanMoney, groupMoney } from "@/lib/money-input";

describe("cleanMoney", () => {
  it("keeps plain digits", () => expect(cleanMoney("12500000")).toBe("12500000"));
  it("strips pasted grouping, spaces and the currency", () => {
    expect(cleanMoney("TZS 1,250,000")).toBe("1250000");
    expect(cleanMoney("1 250 000")).toBe("1250000");
  });
  it("drops the decimal point unless decimals are allowed", () => {
    expect(cleanMoney("1500.75")).toBe("150075");
    expect(cleanMoney("1500.75", { allowDecimals: true })).toBe("1500.75");
    expect(cleanMoney("1.5.5", { allowDecimals: true })).toBe("1.55");
  });
  it("allows one leading minus only when negative is allowed", () => {
    expect(cleanMoney("-500")).toBe("500");
    expect(cleanMoney("-500", { allowNegative: true })).toBe("-500");
    expect(cleanMoney("5-00", { allowNegative: true })).toBe("500");
  });
  it("removes leading zeros but keeps a single 0", () => {
    expect(cleanMoney("007")).toBe("7");
    expect(cleanMoney("0")).toBe("0");
    expect(cleanMoney("000")).toBe("0");
  });
  it("turns letters and symbols into nothing", () => expect(cleanMoney("abc")).toBe(""));
});

describe("groupMoney", () => {
  it("groups thousands", () => {
    expect(groupMoney("0")).toBe("0");
    expect(groupMoney("999")).toBe("999");
    expect(groupMoney("1000")).toBe("1,000");
    expect(groupMoney("12500000")).toBe("12,500,000");
  });
  it("keeps decimals and negatives intact", () => {
    expect(groupMoney("-1234567.5")).toBe("-1,234,567.5");
    expect(groupMoney("12.")).toBe("12.");
  });
  it("leaves partial input alone", () => {
    expect(groupMoney("")).toBe("");
    expect(groupMoney("-")).toBe("-");
  });
});
