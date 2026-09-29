import {
  type FilterDimension,
  type ReportFilters,
  type ReportKind,
  filtersToSearchParams,
  hasActiveFilters,
} from "@/lib/reports/filters";
import type { ExportFormat } from "@/lib/reports/export-href";

/** The English filename word for each report — stable across the viewer's language. */
export const REPORT_FILE_STEM: Record<ReportKind, string> = {
  "financial-summary": "Financial-Summary",
  "material-cost": "Material-Cost",
  procurement: "Procurement",
  labour: "Labour",
  funding: "Funding",
  variations: "Variations",
  "supplier-statement": "Supplier-Statement",
  "subcontractor-statement": "Subcontractor-Statement",
};

/** `basePath` with `filters` as its search params. */
export function filteredHref(basePath: string, filters: ReportFilters): string {
  const qs = filtersToSearchParams(filters).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * The URL with one active filter removed — a chip's "×". A date bound removes
 * the whole range, since `from` and `to` show as one chip.
 */
export function hrefWithout(
  basePath: string,
  filters: ReportFilters,
  dimension: FilterDimension,
): string {
  const next: ReportFilters = { ...filters };
  if (dimension === "from" || dimension === "to") {
    delete next.from;
    delete next.to;
  } else {
    delete next[dimension];
  }
  return filteredHref(basePath, next);
}

/** Today's date in East Africa Time, `YYYY-MM-DD` — the filename date. */
function todayEat(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * `{Report}-{projectCode}-{YYYY-MM-DD}[-filtered].{ext}` (ticket "Export
 * formats and whether filters carry into them"). `stem` is e.g.
 * "Procurement-PRJ-2026-001"; anything outside `[A-Za-z0-9._-]` is dropped.
 */
export function exportFilename(
  stem: string,
  filters: ReportFilters,
  format: ExportFormat,
): string {
  const safe = stem
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/-+/g, "-");
  const suffix = hasActiveFilters(filters) ? "-filtered" : "";
  return `${safe}-${todayEat()}${suffix}.${format}`;
}
