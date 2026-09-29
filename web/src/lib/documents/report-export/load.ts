import "server-only";

import {
  getFundingReport,
  getLabourReport,
  getMaterialCostReport,
  getProcurementReport,
  getProjectOverview,
  getSubcontractorInput,
  getSubcontractorStatement,
  getSupplierInput,
  getSupplierStatement,
  getVariationReport,
} from "@/lib/data";
import { getDocumentProfile, type DocumentProfile } from "@/lib/data/documents";
import { getProjectFinancialSummary } from "@/lib/data/reports";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import type { Translator } from "@/lib/i18n/translate";
import type { ReportExportData } from "@/lib/reports/export-table";
import { getReportFilterState } from "@/lib/reports/filter-state";
import type { ReportFilterState, ReportFilters, ReportKind } from "@/lib/reports/filters";

/**
 * Everything a Report Export renders from (ticket "What an exported report
 * is"): the live, already-filtered report or statement, the filter state for
 * the "Filtered: …" line, the Engineer's current letterhead, and the moment it
 * was made. Nothing here is a frozen snapshot — exporting again later gives the
 * figures as they stand then. Never stored.
 */
export interface ReportExportDocument {
  kind: ReportKind;
  data: ReportExportData;
  filterState: ReportFilterState;
  profile: DocumentProfile;
  /** The moment of export — the "As of" line. */
  asOf: Date;
  /** Project code (report) or party name (statement) — the filename scope. */
  scopeLabel: string;
  /** Who / what the export is about: Project + Client + Site, or the party's contact. */
  meta: { label: string; value: string }[];
  /** "Statement for {name}" on a statement; `null` on a report. */
  addressee: string | null;
  t: Translator;
  locale: Locale;
}

async function loadData(
  kind: ReportKind,
  scopeId: string,
  filters: ReportFilters,
): Promise<ReportExportData | null> {
  switch (kind) {
    case "financial-summary": {
      const report = await getProjectFinancialSummary(scopeId, filters);
      return report && { kind, report };
    }
    case "material-cost": {
      const report = await getMaterialCostReport(scopeId, filters);
      return report && { kind, report };
    }
    case "procurement": {
      const report = await getProcurementReport(scopeId, filters);
      return report && { kind, report };
    }
    case "labour": {
      const report = await getLabourReport(scopeId, filters);
      return report && { kind, report };
    }
    case "funding": {
      const report = await getFundingReport(scopeId, filters);
      return report && { kind, report };
    }
    case "variations": {
      const report = await getVariationReport(scopeId, filters);
      return report && { kind, report };
    }
    case "supplier-statement": {
      const statement = await getSupplierStatement(scopeId, filters);
      return statement && { kind, statement };
    }
    case "subcontractor-statement": {
      const statement = await getSubcontractorStatement(scopeId, filters);
      return statement && { kind, statement };
    }
  }
}

/**
 * Load one Report Export, or `null` when the project / party is missing or
 * belongs to another Account (RLS scopes every read; the route answers 404).
 * Throws `NotAuthenticatedError` with no session, like every DAL read.
 */
export async function loadReportExport(
  kind: ReportKind,
  scopeId: string,
  filters: ReportFilters,
): Promise<ReportExportDocument | null> {
  const asOf = new Date();
  const data = await loadData(kind, scopeId, filters);
  if (!data) return null;

  const [filterState, profile, t, locale] = await Promise.all([
    getReportFilterState(kind, scopeId, filters),
    getDocumentProfile(),
    getT(),
    getLocale(),
  ]);
  if (!profile) return null;

  if (data.kind === "supplier-statement" || data.kind === "subcontractor-statement") {
    const party =
      data.kind === "supplier-statement"
        ? await getSupplierInput(scopeId)
        : await getSubcontractorInput(scopeId);
    const contact = [
      party && "contactPerson" in party ? party.contactPerson : undefined,
      party?.phone,
      party?.email,
    ].filter((v): v is string => Boolean(v));
    return {
      kind,
      data,
      filterState,
      profile,
      asOf,
      scopeLabel: data.statement.name,
      meta: contact.length > 0 ? [{ label: t("reportExport.contact"), value: contact.join(" · ") }] : [],
      addressee: t("reportExport.statementFor", { name: data.statement.name }),
      t,
      locale,
    };
  }

  const project = await getProjectOverview(scopeId);
  if (!project) return null;
  const { report } = data;
  return {
    kind,
    data,
    filterState,
    profile,
    asOf,
    scopeLabel: report.projectCode,
    meta: [
      { label: t("reportExport.project"), value: `${report.projectName} (${report.projectCode})` },
      { label: t("reportExport.client"), value: project.clientName },
      { label: t("reportExport.site"), value: project.site },
    ],
    addressee: null,
    t,
    locale,
  };
}
