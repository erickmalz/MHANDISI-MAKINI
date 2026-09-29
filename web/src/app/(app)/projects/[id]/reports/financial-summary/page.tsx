import { notFound } from "next/navigation";

import { getProjectFinancialSummary } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";
import { STAGE_STATUS_LABEL } from "../../../_components/status-labels";
import { NoMatch, ReportToolbar } from "@/components/reports/ReportToolbar";
import { REPORT_FILE_STEM } from "@/components/reports/filter-links";
import { hasActiveFilters, parseReportFilters } from "@/lib/reports/filters";
import { getReportFilterState } from "@/lib/reports/filter-state";

export const generateMetadata = pageTitle("reports.financialSummary.pageTitle");

/**
 * Project Financial Summary (guidelines §38, Phase 4 ticket 06) — funding
 * requested/received, fees, commitments, payments, available float and
 * forecast shortfall, plus the stage-by-stage breakdown. Every figure is
 * reused straight from `@/lib/finance` / `@/lib/funding`'s existing
 * derivations, summed across this project's stages — see
 * `@/lib/data/reports.ts`.
 */
export default async function FinancialSummaryReportPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/reports/financial-summary">) {
  const { id } = await params;
  const filters = parseReportFilters("financial-summary", await searchParams);
  const [report, filterState] = await Promise.all([
    getProjectFinancialSummary(id, filters),
    getReportFilterState("financial-summary", id, filters),
  ]);
  if (!report) notFound();
  const t = await getT();
  const filtered = hasActiveFilters(filters);
  const title = t("reports.financialSummary.label");

  // Print opens the PDF (ticket "Export formats and whether filters carry into
  // them"): the old window.print() sheet is retired and its working-ledger
  // layout lives in the PDF template.
  return (
    <PageFrame width="working">
      <div>
        <PageHeader
          crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
          title={title}
        />

        <ReportToolbar
          state={filterState}
          scopeId={id}
          basePath={`/projects/${id}/reports/financial-summary`}
          shareTitle={`${title} — ${report.projectCode}`}
          fileStem={`${REPORT_FILE_STEM["financial-summary"]}-${report.projectCode}`}
        />

        <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label={t("reports.financialSummary.fundingRequested")} amount={report.fundingRequested} />
          <StatTile label={t("reports.financialSummary.fundingReceived")} amount={report.fundingReceived} />
          <StatTile label={t("reports.financialSummary.feesInvoiced")} amount={report.feesInvoiced} />
          <StatTile label={t("reports.financialSummary.feesReceived")} amount={report.feesReceived} />
          <StatTile label={t("reports.financialSummary.feesOutstanding")} amount={report.feesOutstanding} />
          <StatTile label={t("reports.financialSummary.commitments")} amount={report.commitments} />
          <StatTile label={t("reports.financialSummary.payments")} amount={report.payments} />
          <StatTile
            label={t("reports.financialSummary.availableFloat")}
            amount={report.availableFloat}
            tone={report.availableFloat < 0 ? "destructive" : undefined}
          />
          <StatTile
            label={t("reports.financialSummary.forecastShortfall")}
            amount={report.forecastShortfall}
            emphasis
            tone={report.forecastShortfall > 0 ? "destructive" : undefined}
          />
          {filtered && (
            <p className="col-span-full text-sm text-muted-foreground">
              {t("reportToolbar.filteredTotals")}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-card-foreground">
            {t("reports.financialSummary.stageByStage")}
          </h2>
          {report.stages.length === 0 ? (
            filtered ? (
              <div className="mt-3">
                <NoMatch />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("reports.financialSummary.noStages")}
              </p>
            )
          ) : (
            <DataTable
              caption={t("reports.financialSummary.caption")}
              rows={report.stages}
              rowKey={(s) => s.stageId}
              columns={[
                {
                  key: "stage",
                  header: t("reports.financialSummary.columns.stage"),
                  cell: (s) => (
                    <>
                      <p className="font-bold text-card-foreground">{s.stageName}</p>
                      <p className="text-sm text-muted-foreground">
                        {STAGE_STATUS_LABEL[s.status] ? t(STAGE_STATUS_LABEL[s.status]) : s.status}
                      </p>
                    </>
                  ),
                },
                {
                  key: "health",
                  header: t("reports.financialSummary.columns.health"),
                  cell: (s) => (
                    <>
                      <HealthBadge health={s.health} size="sm" />
                    </>
                  ),
                },
                {
                  key: "client-deposits",
                  header: t("reports.financialSummary.columns.clientDeposits"),
                  align: "right",
                  cell: (s) => (
                    <>
                      <Money amount={s.clientDeposits} className="text-card-foreground" />
                    </>
                  ),
                },
                {
                  key: "commitments",
                  header: t("reports.financialSummary.columns.commitments"),
                  align: "right",
                  cell: (s) => (
                    <>
                      <Money amount={s.commitments} className="text-card-foreground" />
                    </>
                  ),
                },
                {
                  key: "payments",
                  header: t("reports.financialSummary.columns.payments"),
                  align: "right",
                  cell: (s) => (
                    <>
                      <Money amount={s.payments} className="text-card-foreground" />
                    </>
                  ),
                },
                {
                  key: "available-float",
                  header: t("reports.financialSummary.columns.availableFloat"),
                  align: "right",
                  cell: (s) => (
                    <>
                      <Money amount={s.availableFloat} className="text-card-foreground" />
                    </>
                  ),
                },
                {
                  key: "forecast-requirement",
                  header: t("reports.financialSummary.columns.forecastRequirement"),
                  align: "right",
                  cell: (s) => (
                    <>
                      <Money
                        amount={s.forecastFundingRequirement}
                        className="text-card-foreground"
                      />
                    </>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>
    </PageFrame>
  );
}
