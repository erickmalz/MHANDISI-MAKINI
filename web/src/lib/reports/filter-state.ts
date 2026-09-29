import "server-only";

import {
  getFundingReport,
  getLabourReport,
  getMaterialCostReport,
  getProcurementReport,
  getProjectFinancialSummary,
  getVariationReport,
} from "@/lib/data/reports";
import { getSubcontractorStatement, getSupplierStatement } from "@/lib/data/statements";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import type { Translator } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/types";

import {
  type FilterOptions,
  buildActiveFilters,
  formatDateSpan,
  formatSingleDate,
} from "./filter-logic";
import type {
  FilterDimension,
  ReportFilterState,
  ReportFilters,
  ReportKind,
} from "./filters";
import { hasFinerFilter } from "./filters";

const camel = (slug: string) => slug.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());

/** The message key naming one enum value on one report, or `null` for an id dimension. */
function enumLabelKey(kind: ReportKind, dim: FilterDimension, value: string): MessageKey | null {
  if (dim === "kind") return `reportFilters.kind.${value}` as MessageKey;
  if (dim === "funding") return `reports.variations.fundingStatus.${camel(value)}` as MessageKey;
  if (dim !== "status") return null;
  switch (kind) {
    case "procurement":
    case "supplier-statement":
      return `procurement.status.${camel(value)}` as MessageKey;
    case "funding":
      return `funding.status.${camel(value)}` as MessageKey;
    case "labour":
    case "subcontractor-statement":
      return `reports.taskStatus.${camel(value)}` as MessageKey;
    case "variations":
      return `variations.status.${value}` as MessageKey;
    default:
      return null;
  }
}

/** Which date a report's range filters on — the verb its label uses. */
const DATE_VERB: Partial<Record<ReportKind, MessageKey>> = {
  procurement: "reportFilters.range.issued",
  funding: "reportFilters.range.issued",
  variations: "reportFilters.range.requested",
  "supplier-statement": "reportFilters.range.dated",
  "subcontractor-statement": "reportFilters.range.dated",
};

function dateRangeLabel(kind: ReportKind, t: Translator, locale: Locale) {
  return (from: string | undefined, to: string | undefined): string => {
    const range =
      from && to
        ? formatDateSpan(from, to, locale)
        : from
          ? t("reportFilters.range.from", { date: formatSingleDate(from, locale) })
          : t("reportFilters.range.until", { date: formatSingleDate(to as string, locale) });
    const verb = DATE_VERB[kind];
    return verb ? t(verb, { range }) : range;
  };
}

/** The report's own options + applied filters, from the (request-cached) DAL read. */
async function readSource(
  kind: ReportKind,
  scopeId: string,
  filters: ReportFilters,
): Promise<{ filterOptions: FilterOptions; appliedFilters: ReportFilters } | null> {
  switch (kind) {
    case "financial-summary":
      return getProjectFinancialSummary(scopeId, filters);
    case "material-cost":
      return getMaterialCostReport(scopeId, filters);
    case "procurement":
      return getProcurementReport(scopeId, filters);
    case "labour":
      return getLabourReport(scopeId, filters);
    case "funding":
      return getFundingReport(scopeId, filters);
    case "variations":
      return getVariationReport(scopeId, filters);
    case "supplier-statement":
      return getSupplierStatement(scopeId, filters);
    case "subcontractor-statement":
      return getSubcontractorStatement(scopeId, filters);
  }
}

/**
 * The filter state a report screen or export shows: choices per dimension
 * (only values that occur here), the active filters with display labels, and
 * the two flags. Values that don't occur in this project / statement (a
 * foreign or stale id, a hand-edited URL) are dropped from `filters` — the
 * same rule the DAL applies, so the screen and its figures always agree.
 * The underlying read is request-cached, so calling this beside the report
 * itself costs no extra database round trip.
 */
export async function getReportFilterState(
  kind: ReportKind,
  /** The project id for a report, the supplier / subcontractor id for a statement. */
  scopeId: string,
  filters: ReportFilters,
): Promise<ReportFilterState> {
  const source = await readSource(kind, scopeId, filters);
  if (!source) {
    return {
      kind,
      filters: {},
      options: {},
      active: [],
      dateRangeActive: false,
      finerFilterActive: false,
    };
  }

  const [t, locale] = await Promise.all([getT(), getLocale()]);

  const options: FilterOptions = {};
  for (const [dim, list] of Object.entries(source.filterOptions) as [
    FilterDimension,
    FilterOptions[FilterDimension],
  ][]) {
    options[dim] = (list ?? []).map((o) => {
      const key = enumLabelKey(kind, dim, o.value);
      return key ? { value: o.value, label: t(key) } : o;
    });
  }

  const applied = source.appliedFilters;
  return {
    kind,
    filters: applied,
    options,
    active: buildActiveFilters(kind, applied, options, dateRangeLabel(kind, t, locale)),
    dateRangeActive: Boolean(applied.from || applied.to),
    finerFilterActive: hasFinerFilter(applied),
  };
}
