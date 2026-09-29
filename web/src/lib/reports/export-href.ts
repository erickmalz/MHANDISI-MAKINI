import { type ReportFilters, type ReportKind, filtersToSearchParams } from "./filters";

/**
 * Where a Report Export is served (ticket "Export formats and whether filters
 * carry into them"): an authenticated route handler next to the screen, carrying
 * the screen's own filter search params. CONTRACT FILE — shared by the export,
 * share and toolbar builders.
 */
export type ExportFormat = "pdf" | "jpg" | "csv";

export function reportExportHref(
  kind: ReportKind,
  /** The project id for a report, the supplier / subcontractor id for a statement. */
  scopeId: string,
  format: ExportFormat,
  filters: ReportFilters,
): string {
  const base =
    kind === "supplier-statement"
      ? `/suppliers/${scopeId}`
      : kind === "subcontractor-statement"
        ? `/subcontractors/${scopeId}`
        : `/projects/${scopeId}/reports/${kind}`;
  const qs = filtersToSearchParams(filters).toString();
  return `${base}/export.${format}${qs ? `?${qs}` : ""}`;
}
