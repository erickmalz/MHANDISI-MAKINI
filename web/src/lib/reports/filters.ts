/**
 * Report filters — the shared contract for the Reports filters / export /
 * share / print build (`.scratch/reports-toolbar/`, ticket "Which filters each
 * report gets" and, for the Statements, "Do the Supplier and Subcontractor
 * Statements get the report toolbar?").
 *
 * Filter state lives in the URL search params, one value per dimension,
 * combined with AND. An unknown or foreign value is ignored (treated as "All").
 *
 * CONTRACT FILE: the signatures and types here are shared by every builder.
 * `parseReportFilters` and `filtersToSearchParams` are complete; the
 * `getReportFilterState` stub is replaced by the filters builder.
 */

export type ReportKind =
  | "financial-summary"
  | "material-cost"
  | "procurement"
  | "labour"
  | "funding"
  | "variations"
  | "supplier-statement"
  | "subcontractor-statement";

/** Search-param names. `from` / `to` are ISO dates (YYYY-MM-DD). */
export type FilterDimension =
  | "stage"
  | "project"
  | "supplier"
  | "subcontractor"
  | "status"
  | "kind"
  | "funding"
  | "from"
  | "to";

export type ReportFilters = Partial<Record<FilterDimension, string>>;

/** Which dimensions each report or statement accepts (ticket 02 + ticket 07 tables). */
export const REPORT_DIMENSIONS: Record<ReportKind, readonly FilterDimension[]> = {
  "financial-summary": ["stage"],
  "material-cost": ["stage"],
  procurement: ["stage", "supplier", "status", "from", "to"],
  labour: ["stage", "subcontractor", "status"],
  funding: ["stage", "kind", "status", "from", "to"],
  variations: ["stage", "status", "funding", "from", "to"],
  "supplier-statement": ["project", "status", "from", "to"],
  "subcontractor-statement": ["project", "status", "from", "to"],
};

/** Dimensions that scope to a whole stage / project; anything else is "finer". */
const SCOPE_DIMENSIONS: readonly FilterDimension[] = ["stage", "project"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | undefined {
  const raw = source instanceof URLSearchParams ? source.get(key) : source[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * The filters a report accepts, read from search params. Syntax only — a
 * well-formed id that doesn't exist in this project is dropped later by the
 * data layer (it yields no options match), never an error.
 */
export function parseReportFilters(kind: ReportKind, source: ParamSource): ReportFilters {
  const filters: ReportFilters = {};
  for (const dim of REPORT_DIMENSIONS[kind]) {
    const value = read(source, dim);
    if (value == null) continue;
    if ((dim === "from" || dim === "to") && !ISO_DATE.test(value)) continue;
    filters[dim] = value;
  }
  return filters;
}

/** The search params that reproduce `filters` (stable key order). */
export function filtersToSearchParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))) {
    if (value) params.set(key, value);
  }
  return params;
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return Object.values(filters).some(Boolean);
}

/** True when a filter finer than stage/project is on — per-stage-only headlines hide. */
export function hasFinerFilter(filters: ReportFilters): boolean {
  return Object.entries(filters).some(
    ([dim, value]) => value && !SCOPE_DIMENSIONS.includes(dim as FilterDimension),
  );
}

export interface FilterOption {
  value: string;
  /** Display label, already in the viewer's language where it is an enum. */
  label: string;
}

/** One active filter, for chips and the "Filtered: …" line. */
export interface ActiveFilter {
  dimension: FilterDimension;
  value: string;
  /** e.g. "Walling", "Depot Ltd", "Part delivered", "1–30 Sep 2026". */
  label: string;
}

export interface ReportFilterState {
  kind: ReportKind;
  filters: ReportFilters;
  /** Choices per dimension — only values that occur in this project / statement. */
  options: Partial<Record<FilterDimension, FilterOption[]>>;
  /** Active filters in dimension order; `from`+`to` collapse into one entry keyed `from`. */
  active: ActiveFilter[];
  /** A date range is on → money columns are "as of today". */
  dateRangeActive: boolean;
  /** A filter finer than stage/project is on → hide per-stage-only headlines. */
  finerFilterActive: boolean;
}
