/**
 * The pure half of report filtering (ticket "Which filters each report gets",
 * `.scratch/reports-toolbar/issues/02-which-filters-each-report-gets.md`):
 * value slugs for derived statuses, date handling in East Africa Time,
 * sanitising a URL's filters against the options that actually occur, and the
 * active-filter list. No I/O, so it is unit-tested directly; the DAL
 * (`@/lib/data/reports`, `@/lib/data/statements`) and `getReportFilterState`
 * both build on it.
 */
import type { FRStatus } from "@/lib/funding";
import { INTL_TAG, type Locale } from "@/lib/i18n/locales";
import type { POStatus } from "@/lib/procurement";

import type {
  ActiveFilter,
  FilterDimension,
  FilterOption,
  ReportFilters,
  ReportKind,
} from "./filters";
import { REPORT_DIMENSIONS } from "./filters";

export type FilterOptions = Partial<Record<FilterDimension, FilterOption[]>>;

// --- Status slugs (URL values for derived, display-cased statuses) --------

export const PO_STATUS_SLUG: Record<POStatus, string> = {
  Planned: "planned",
  Ordered: "ordered",
  "Partially Delivered": "partially-delivered",
  Delivered: "delivered",
  "Partially Paid": "partially-paid",
  Paid: "paid",
  Cancelled: "cancelled",
  Closed: "closed",
};

export const FR_STATUS_SLUG: Record<FRStatus, string> = {
  Draft: "draft",
  Issued: "issued",
  "Partially Deposited": "partially-deposited",
  Deposited: "deposited",
  Superseded: "superseded",
  Cancelled: "cancelled",
  Closed: "closed",
};

/** The Variation Report's derived funding status (see `variationFundingStatus`). */
export const VARIATION_FUNDING_SLUG: Record<string, string> = {
  "Not applicable": "not-applicable",
  "Not linked to a funding request": "not-linked",
  "Funding request pending": "pending",
  Funded: "funded",
};

/** Stored `tasks.status` values, in lifecycle order. */
export const TASK_STATUS_ORDER = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
/** Stored `purchase_orders.status` values, in lifecycle order (Supplier Statement). */
export const PO_STORED_STATUS_ORDER = ["planned", "ordered", "cancelled", "closed"] as const;
export const VARIATION_STATUS_ORDER = ["draft", "approved", "rejected", "cancelled"] as const;
export const FR_KIND_ORDER = ["base", "additional"] as const;

// --- Dates -----------------------------------------------------------------

export const EAT_TIME_ZONE = "Africa/Dar_es_Salaam";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The calendar date (YYYY-MM-DD) a record happened on, in East Africa Time. A
 * bare date string is already a calendar date and passes through unchanged;
 * a timestamp is converted so a PO issued at 01:00 EAT isn't filed under the
 * previous UTC day.
 */
export function toEatDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && ISO_DATE.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Whether a record's date falls in the (inclusive) range. No range → always.
 * With a range, a record with no date of its own (a Planned PO, a Draft
 * request) is outside it.
 */
export function inDateRange(date: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (date == null) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(date: Date, locale: Locale, opts: Intl.DateTimeFormatOptions): string {
  return date
    .toLocaleDateString(INTL_TAG[locale], { timeZone: "UTC", ...opts })
    .replace("Sept", "Sep");
}

/**
 * A compact, unambiguous range: "1–30 Sep 2026", "28 Sep – 3 Oct 2026",
 * "30 Dec 2025 – 2 Jan 2026". Always the house "day month year" order, never
 * numeric-only dates.
 */
export function formatDateSpan(from: string, to: string, locale: Locale): string {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  const full = (d: Date) => fmt(d, locale, { day: "numeric", month: "short", year: "numeric" });
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${full(a)} – ${full(b)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${fmt(a, locale, { day: "numeric", month: "short" })} – ${full(b)}`;
  }
  if (a.getUTCDate() === b.getUTCDate()) return full(a);
  return `${a.getUTCDate()}–${full(b)}`;
}

export function formatSingleDate(iso: string, locale: Locale): string {
  return fmt(parseIsoDate(iso), locale, { day: "numeric", month: "short", year: "numeric" });
}

// --- Options -----------------------------------------------------------------

/** Deduplicate by value, first occurrence wins, order kept. */
export function uniqueOptions(options: Iterable<FilterOption>): FilterOption[] {
  const seen = new Set<string>();
  const out: FilterOption[] = [];
  for (const o of options) {
    if (!o.value || seen.has(o.value)) continue;
    seen.add(o.value);
    out.push(o);
  }
  return out;
}

/** Deduplicated and sorted by label (supplier / subcontractor / project names). */
export function sortedByLabel(options: Iterable<FilterOption>): FilterOption[] {
  return uniqueOptions(options).sort((a, b) => a.label.localeCompare(b.label));
}

/** The values from `order` that are present, in `order`'s order, as options (label = value). */
export function presentInOrder(order: readonly string[], present: Iterable<string>): FilterOption[] {
  const set = new Set(present);
  return order.filter((v) => set.has(v)).map((v) => ({ value: v, label: v }));
}

// --- Sanitising ----------------------------------------------------------------

/**
 * The filters a report will actually apply: only the dimensions it accepts,
 * enumerable values only when they occur among `options` (an unknown or
 * foreign id is treated as "All", never an error), dates only when well-formed
 * and swapped into order if reversed.
 */
export function sanitizeFilters(
  kind: ReportKind,
  filters: ReportFilters,
  options: FilterOptions,
): ReportFilters {
  const out: ReportFilters = {};
  for (const dim of REPORT_DIMENSIONS[kind]) {
    const value = filters[dim];
    if (!value) continue;
    if (dim === "from" || dim === "to") {
      if (ISO_DATE.test(value)) out[dim] = value;
      continue;
    }
    if ((options[dim] ?? []).some((o) => o.value === value)) out[dim] = value;
  }
  if (out.from && out.to && out.from > out.to) {
    [out.from, out.to] = [out.to, out.from];
  }
  return out;
}

// --- Active filters ------------------------------------------------------------

/**
 * The active filters in the report's own dimension order, each with its
 * display label. `from` + `to` collapse into one entry keyed `from`, labelled
 * by `dateLabel` (which composes "Issued 1–30 Sep 2026" and the like).
 */
export function buildActiveFilters(
  kind: ReportKind,
  applied: ReportFilters,
  options: FilterOptions,
  dateLabel: (from: string | undefined, to: string | undefined) => string,
): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  for (const dim of REPORT_DIMENSIONS[kind]) {
    if (dim === "to") continue;
    if (dim === "from") {
      if (applied.from || applied.to) {
        active.push({
          dimension: "from",
          value: `${applied.from ?? ""}..${applied.to ?? ""}`,
          label: dateLabel(applied.from, applied.to),
        });
      }
      continue;
    }
    const value = applied[dim];
    if (!value) continue;
    const option = (options[dim] ?? []).find((o) => o.value === value);
    active.push({ dimension: dim, value, label: option?.label ?? value });
  }
  return active;
}
