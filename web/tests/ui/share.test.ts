import { describe, expect, it } from "vitest";

import {
  ACTIVATION_BUDGET_MS,
  actionForTap,
  canShareFiles,
  classifyShareError,
  filenameFor,
  mimeFor,
  nextItemState,
  withinActivation,
} from "@/components/share/share-logic";

describe("share logic", () => {
  it("maps each format to the exact MIME type the share allowlist checks", () => {
    expect(mimeFor("pdf")).toBe("application/pdf");
    expect(mimeFor("jpg")).toBe("image/jpeg");
    expect(mimeFor("csv")).toBe("text/csv");
  });

  it("makes sure the filename carries the format's extension", () => {
    expect(filenameFor("pdf", "Procurement-PRJ-1-2026-09-29.pdf")).toBe(
      "Procurement-PRJ-1-2026-09-29.pdf",
    );
    expect(filenameFor("csv", "Labour-PRJ-1")).toBe("Labour-PRJ-1.csv");
    expect(filenameFor("jpg", "Funding.JPG")).toBe("Funding.JPG");
  });

  it("allows sharing on the same tap only inside the activation budget", () => {
    expect(withinActivation(1_000, 1_000 + ACTIVATION_BUDGET_MS)).toBe(true);
    expect(withinActivation(1_000, 1_001 + ACTIVATION_BUDGET_MS)).toBe(false);
  });

  it("stays silent when the sheet is dismissed and falls back otherwise", () => {
    expect(classifyShareError(new DOMException("closed", "AbortError"))).toBe("cancelled");
    expect(classifyShareError(new DOMException("no", "NotAllowedError"))).toBe("fallback");
    expect(classifyShareError(new TypeError("bad"))).toBe("fallback");
    expect(classifyShareError("weird")).toBe("fallback");
  });

  it("detects file sharing only when share and canShare both exist and accept a file", () => {
    expect(canShareFiles(undefined)).toBe(false);
    expect(canShareFiles({})).toBe(false);
    expect(canShareFiles({ share: async () => {} })).toBe(false);
    expect(canShareFiles({ share: async () => {}, canShare: () => false })).toBe(false);
    expect(canShareFiles({ share: async () => {}, canShare: () => true })).toBe(true);
    expect(
      canShareFiles({
        share: async () => {},
        canShare: () => {
          throw new Error("boom");
        },
      }),
    ).toBe(false);
  });

  it("shares a cached file on the tap, fetches an uncached one, ignores double taps", () => {
    expect(actionForTap("idle", true)).toBe("share");
    expect(actionForTap("ready", true)).toBe("share");
    expect(actionForTap("idle", false)).toBe("fetch");
    expect(actionForTap("failed", false)).toBe("fetch");
    expect(actionForTap("fetching", false)).toBe("wait");
  });

  it("turns a late fetch into 'ready' for a second tap", () => {
    let s = nextItemState("idle", { type: "tap", cached: false });
    expect(s).toBe("fetching");
    expect(nextItemState(s, { type: "tap", cached: false })).toBe("fetching");
    s = nextItemState(s, { type: "fetched", inTime: false });
    expect(s).toBe("ready");
    expect(nextItemState(s, { type: "shared" })).toBe("idle");
    expect(nextItemState("fetching", { type: "fetched", inTime: true })).toBe("idle");
    expect(nextItemState("fetching", { type: "fetch-failed" })).toBe("failed");
  });
});
