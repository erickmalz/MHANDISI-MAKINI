import { describe, expect, it } from "vitest";

import {
  buildActiveFilters,
  formatDateSpan,
  formatSingleDate,
  inDateRange,
  presentInOrder,
  sanitizeFilters,
  sortedByLabel,
  toEatDate,
  uniqueOptions,
} from "@/lib/reports/filter-logic";
import {
  filtersToSearchParams,
  hasActiveFilters,
  hasFinerFilter,
  parseReportFilters,
} from "@/lib/reports/filters";

/**
 * The pure half of report filtering (`.scratch/reports-toolbar/issues/
 * 02-which-filters-each-report-gets.md`): URL round-trip, EAT dates, option
 * lists, sanitising and the active-filter list. The DAL applies these; this
 * suite needs no database.
 */

describe("URL filter state", () => {
  it("round-trips a report's filters through search params", () => {
    const filters = parseReportFilters("procurement", {
      stage: "s1",
      supplier: "sup-9",
      status: "partially-delivered",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    const again = parseReportFilters("procurement", filtersToSearchParams(filters));
    expect(again).toEqual(filters);
  });

  it("keeps only the dimensions the report accepts, and drops malformed dates", () => {
    expect(
      parseReportFilters("labour", { stage: "s1", supplier: "x", from: "2026-09-01" }),
    ).toEqual({ stage: "s1" });
    expect(parseReportFilters("funding", { from: "01/09/2026", to: "2026-09-30" })).toEqual({
      to: "2026-09-30",
    });
  });

  it("takes the first value of a repeated param and ignores blanks", () => {
    expect(parseReportFilters("variations", { stage: ["a", "b"], status: "  " })).toEqual({
      stage: "a",
    });
  });

  it("flags active and finer-than-stage filters", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasFinerFilter({ stage: "s1" })).toBe(false);
    expect(hasFinerFilter({ project: "p1" })).toBe(false);
    expect(hasFinerFilter({ stage: "s1", supplier: "x" })).toBe(true);
    expect(hasFinerFilter({ from: "2026-09-01" })).toBe(true);
  });
});

describe("dates in East Africa Time", () => {
  it("passes a bare calendar date through", () => {
    expect(toEatDate("2026-09-30")).toBe("2026-09-30");
  });

  it("files a timestamp under its EAT day, not its UTC day", () => {
    // 22:30 UTC on 30 Sep is 01:30 EAT on 1 Oct.
    expect(toEatDate("2026-09-30T22:30:00Z")).toBe("2026-10-01");
    expect(toEatDate(new Date("2026-09-30T20:59:00Z"))).toBe("2026-09-30");
  });

  it("returns null for missing or unparseable input", () => {
    expect(toEatDate(null)).toBeNull();
    expect(toEatDate("not a date")).toBeNull();
  });

  it("matches an inclusive range, and a dateless row is outside any range", () => {
    expect(inDateRange("2026-09-15", "2026-09-01", "2026-09-30")).toBe(true);
    expect(inDateRange("2026-09-30", "2026-09-01", "2026-09-30")).toBe(true);
    expect(inDateRange("2026-10-01", "2026-09-01", "2026-09-30")).toBe(false);
    expect(inDateRange("2026-08-31", "2026-09-01")).toBe(false);
    expect(inDateRange(null, undefined, undefined)).toBe(true);
    expect(inDateRange(null, "2026-09-01")).toBe(false);
  });
});

describe("date range labels", () => {
  it("collapses a same-month range", () => {
    expect(formatDateSpan("2026-09-01", "2026-09-30", "en")).toBe("1–30 Sep 2026");
  });

  it("spans months and years in day-month-year order", () => {
    expect(formatDateSpan("2026-09-28", "2026-10-03", "en")).toBe("28 Sep – 3 Oct 2026");
    expect(formatDateSpan("2025-12-30", "2026-01-02", "en")).toBe("30 Dec 2025 – 2 Jan 2026");
  });

  it("shows a one-day range as that day", () => {
    expect(formatDateSpan("2026-09-05", "2026-09-05", "en")).toBe("5 Sep 2026");
    expect(formatSingleDate("2026-09-05", "en")).toBe("5 Sep 2026");
  });
});

describe("options", () => {
  it("dedupes by value, keeping the first occurrence and order", () => {
    expect(
      uniqueOptions([
        { value: "b", label: "B" },
        { value: "a", label: "A" },
        { value: "b", label: "B again" },
        { value: "", label: "blank" },
      ]),
    ).toEqual([
      { value: "b", label: "B" },
      { value: "a", label: "A" },
    ]);
  });

  it("sorts names after deduping", () => {
    expect(
      sortedByLabel([
        { value: "2", label: "Zuri Hardware" },
        { value: "1", label: "Depot Ltd" },
        { value: "2", label: "Zuri Hardware" },
      ]).map((o) => o.label),
    ).toEqual(["Depot Ltd", "Zuri Hardware"]);
  });

  it("lists only the statuses present, in lifecycle order", () => {
    expect(
      presentInOrder(["planned", "active", "on_hold", "completed"], ["completed", "planned", "planned"]),
    ).toEqual([
      { value: "planned", label: "planned" },
      { value: "completed", label: "completed" },
    ]);
  });
});

describe("sanitizeFilters", () => {
  const options = {
    stage: [{ value: "s1", label: "Walling" }],
    supplier: [{ value: "sup-1", label: "Depot Ltd" }],
    status: [{ value: "paid", label: "paid" }],
  };

  it("drops ids that don't occur here — a foreign id means All", () => {
    expect(
      sanitizeFilters("procurement", { stage: "other-accounts-stage", supplier: "sup-1" }, options),
    ).toEqual({ supplier: "sup-1" });
  });

  it("drops dimensions the report doesn't accept", () => {
    expect(sanitizeFilters("material-cost", { stage: "s1", supplier: "sup-1" }, options)).toEqual({
      stage: "s1",
    });
  });

  it("puts a reversed range back in order", () => {
    expect(
      sanitizeFilters("procurement", { from: "2026-09-30", to: "2026-09-01" }, options),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});

describe("buildActiveFilters", () => {
  it("labels each active filter in the report's dimension order, collapsing the range", () => {
    const active = buildActiveFilters(
      "procurement",
      { to: "2026-09-30", supplier: "sup-1", from: "2026-09-01", stage: "s1" },
      {
        stage: [{ value: "s1", label: "Walling" }],
        supplier: [{ value: "sup-1", label: "Depot Ltd" }],
      },
      (from, to) => `Issued ${from}..${to}`,
    );
    expect(active).toEqual([
      { dimension: "stage", value: "s1", label: "Walling" },
      { dimension: "supplier", value: "sup-1", label: "Depot Ltd" },
      { dimension: "from", value: "2026-09-01..2026-09-30", label: "Issued 2026-09-01..2026-09-30" },
    ]);
  });

  it("shows an open-ended range", () => {
    const active = buildActiveFilters("funding", { to: "2026-09-30" }, {}, (from, to) =>
      from ? `from ${from}` : `up to ${to}`,
    );
    expect(active).toEqual([{ dimension: "from", value: "..2026-09-30", label: "up to 2026-09-30" }]);
  });
});
