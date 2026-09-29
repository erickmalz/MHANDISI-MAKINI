import Link from "next/link";
import { notFound } from "next/navigation";

import { getProcurementReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { POStatusBadge } from "../../procurement/_components/POStatusBadge";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";
import { NoMatch, ReportToolbar } from "@/components/reports/ReportToolbar";
import { REPORT_FILE_STEM } from "@/components/reports/filter-links";
import { hasActiveFilters, parseReportFilters } from "@/lib/reports/filters";
import { getReportFilterState } from "@/lib/reports/filter-state";

export const generateMetadata = pageTitle("reports.procurement.pageTitle");

/**
 * Procurement Report (guidelines §38, Phase 4 ticket 06) — every Purchase
 * Order against what the take-off requires. "Required" reuses the project's
 * already-computed material estimate; every order row reuses
 * `@/lib/procurement`'s existing pure derivations, the same ones the
 * Purchase Order screens already call — see `@/lib/data/reports.ts`.
 */
export default async function ProcurementReportPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/reports/procurement">) {
  const { id } = await params;
  const filters = parseReportFilters("procurement", await searchParams);
  const [report, filterState] = await Promise.all([
    getProcurementReport(id, filters),
    getReportFilterState("procurement", id, filters),
  ]);
  if (!report) notFound();
  const t = await getT();
  const filtered = hasActiveFilters(filters);
  const title = t("reports.procurement.label");

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
        title={title}
      />

      <ReportToolbar
        state={filterState}
        scopeId={id}
        basePath={`/projects/${id}/reports/procurement`}
        shareTitle={`${title} — ${report.projectCode}`}
        fileStem={`${REPORT_FILE_STEM.procurement}-${report.projectCode}`}
      />

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {/* "Required" is the stage's material estimate — there is no per-supplier / status / date figure. */}
        {!filterState.finerFilterActive && (
          <StatTile label={t("reports.procurement.required")} amount={report.required} />
        )}
        <StatTile label={t("reports.procurement.ordered")} amount={report.totals.ordered} />
        <StatTile label={t("reports.procurement.delivered")} amount={report.totals.delivered} />
        <StatTile label={t("reports.procurement.paid")} amount={report.totals.paid} />
        <StatTile
          label={t("reports.procurement.outstanding")}
          amount={report.totals.outstanding}
          tone={report.totals.outstanding > 0 ? "destructive" : undefined}
        />
        {filtered && (
          <p className="col-span-full text-sm text-muted-foreground">
            {t("reportToolbar.filteredTotals")}
          </p>
        )}
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          filtered ? (
            <NoMatch />
          ) : (
            <p className="text-sm text-muted-foreground">{t("reports.procurement.empty")}</p>
          )
        ) : (
          <DataTable
            caption={t("reports.procurement.caption")}
            rows={report.rows}
            rowKey={(r) => r.purchaseOrderId}
            columns={[
              {
                key: "order",
                header: t("reports.procurement.columns.order"),
                cell: (r) => (
                  <>
                    <Link
                      href={`/projects/${report.projectId}/procurement/${r.purchaseOrderId}`}
                      className="font-bold text-card-foreground hover:underline"
                    >
                      {r.displayNumber ?? t("procurement.list.draft")}
                    </Link>
                    <div className="mt-1">
                      <POStatusBadge status={r.status} size="sm" />
                    </div>
                  </>
                ),
              },
              {
                key: "stage",
                header: t("reports.procurement.columns.stage"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.stageName}
                  </>
                ),
              },
              {
                key: "supplier",
                header: t("reports.procurement.columns.supplier"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.supplierName}
                  </>
                ),
              },
              {
                key: "ordered",
                header: t("reports.procurement.columns.ordered"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.ordered} className="text-card-foreground" />
                  </>
                ),
              },
              {
                key: "delivered",
                header: t("reports.procurement.columns.delivered"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.delivered} className="text-card-foreground" />
                  </>
                ),
              },
              {
                key: "paid",
                header: t("reports.procurement.columns.paid"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.paid} className="text-card-foreground" />
                  </>
                ),
              },
              {
                key: "outstanding",
                header: t("reports.procurement.columns.outstanding"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.outstanding} className="font-bold text-card-foreground" />
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
