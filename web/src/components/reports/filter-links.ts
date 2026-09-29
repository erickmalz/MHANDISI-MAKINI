import {
  type FilterDimension,
  type ReportFilters,
  filtersToSearchParams,
} from "@/lib/reports/filters";

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
