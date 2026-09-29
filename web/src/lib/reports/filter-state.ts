import "server-only";

import type { ReportFilterState, ReportFilters, ReportKind } from "./filters";
import { hasFinerFilter } from "./filters";

/**
 * The filter state a report screen or export shows: choices per dimension,
 * the active filters with display labels, and the two flags. CONTRACT STUB —
 * returns no options and label = raw value; the filters builder replaces the
 * body (signature fixed).
 */
export async function getReportFilterState(
  kind: ReportKind,
  /** The project id for a report, the supplier / subcontractor id for a statement. */
  scopeId: string,
  filters: ReportFilters,
): Promise<ReportFilterState> {
  void scopeId;
  return {
    kind,
    filters,
    options: {},
    active: Object.entries(filters)
      .filter(([, v]) => v)
      .map(([dimension, value]) => ({
        dimension: dimension as keyof ReportFilters,
        value: value as string,
        label: value as string,
      })),
    dateRangeActive: Boolean(filters.from || filters.to),
    finerFilterActive: hasFinerFilter(filters),
  };
}
