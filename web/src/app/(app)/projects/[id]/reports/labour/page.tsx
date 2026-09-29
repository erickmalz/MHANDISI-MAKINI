import Link from "next/link";
import { notFound } from "next/navigation";

import { getLabourReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";
import { TASK_STATUS_LABEL } from "../../../_components/status-labels";
import { NoMatch, ReportToolbar } from "@/components/reports/ReportToolbar";
import { REPORT_FILE_STEM } from "@/components/reports/filter-links";
import { hasActiveFilters, parseReportFilters } from "@/lib/reports/filters";
import { getReportFilterState } from "@/lib/reports/filter-state";

export const generateMetadata = pageTitle("reports.labour.pageTitle");

/**
 * Labour Report (guidelines §38, Phase 4 ticket 06) — every Task's
 * Subcontractor, agreed and revised labour agreement, paid and outstanding,
 * across the whole project. See `@/lib/data/reports.ts`'s
 * `getLabourReport` for the one genuinely new query this ticket needed.
 */
export default async function LabourReportPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/reports/labour">) {
  const { id } = await params;
  const filters = parseReportFilters("labour", await searchParams);
  const [report, filterState] = await Promise.all([
    getLabourReport(id, filters),
    getReportFilterState("labour", id, filters),
  ]);
  if (!report) notFound();
  const t = await getT();
  const filtered = hasActiveFilters(filterState.filters);
  const title = t("reports.labour.label");

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
        title={title}
      />

      <ReportToolbar
        state={filterState}
        scopeId={id}
        basePath={`/projects/${id}/reports/labour`}
        shareTitle={`${title} — ${report.projectCode}`}
        fileStem={`${REPORT_FILE_STEM.labour}-${report.projectCode}`}
      />

      <Card>
        {report.rows.length === 0 ? (
          filtered ? (
            <NoMatch />
          ) : (
            <p className="text-sm text-muted-foreground">{t("reports.labour.empty")}</p>
          )
        ) : (
          <DataTable
            caption={t("reports.labour.caption")}
            totalLabel={t(filtered ? "reports.totalFiltered" : "reports.total")}
            rows={report.rows}
            rowKey={(r) => r.taskId}
            columns={[
              {
                key: "task",
                header: t("reports.labour.columns.task"),
                cell: (r) => (
                  <>
                    <Link
                      href={`/projects/${report.projectId}/tasks/${r.taskId}/edit`}
                      className="font-bold text-card-foreground hover:underline"
                    >
                      {r.taskDescription}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {TASK_STATUS_LABEL[r.status] ? t(TASK_STATUS_LABEL[r.status]) : r.status}
                    </p>
                  </>
                ),
              },
              {
                key: "subcontractor",
                header: t("reports.labour.columns.subcontractor"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.subcontractorName}
                  </>
                ),
              },
              {
                key: "stage",
                header: t("reports.labour.columns.stage"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.stageName}
                  </>
                ),
              },
              {
                key: "agreed",
                header: t("reports.labour.columns.agreed"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.agreed} className="text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.agreed} />
                  </>
                ),
              },
              {
                key: "revised",
                header: t("reports.labour.columns.revised"),
                align: "right",
                cell: (r) => (
                  <>
                    {r.revised != null ? (
                      <Money amount={r.revised} className="text-card-foreground" />
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.revised} />
                  </>
                ),
              },
              {
                key: "paid",
                header: t("reports.labour.columns.paid"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.paid} className="text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.paid} />
                  </>
                ),
              },
              {
                key: "outstanding",
                header: t("reports.labour.columns.outstanding"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.outstanding} className="font-bold text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.outstanding} />
                  </>
                ),
              },
            ]}
          />
        )}
      </Card>
    </PageFrame>
  );
}
