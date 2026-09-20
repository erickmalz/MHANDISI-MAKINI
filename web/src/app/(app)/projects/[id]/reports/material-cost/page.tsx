import { notFound } from "next/navigation";

import { getMaterialCostReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("reports.materialCost.pageTitle");

/**
 * Material Cost Report (guidelines §38, Phase 4 ticket 06) — Estimated
 * (original take-off), Revised, Actual and Variance, per stage. Stage-level
 * granularity throughout: `@/lib/finance`'s `materialVariance` is explicit
 * that there is no stable per-line key between a free-text take-off line and
 * a free-text Purchase Order line, so "Actual" cannot be shown any finer
 * than this — same posture as Budget Variance Analysis (Phase 3 ticket 03).
 */
export default async function MaterialCostReportPage({
  params,
}: PageProps<"/projects/[id]/reports/material-cost">) {
  const { id } = await params;
  const report = await getMaterialCostReport(id);
  if (!report) notFound();
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
        title={t("reports.materialCost.label")}
      />

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("reports.materialCost.noStages")}
          </p>
        ) : (
          <DataTable
            caption={t("reports.materialCost.caption")}
            totalLabel={t("reports.total")}
            rows={report.rows}
            rowKey={(r) => r.stageId}
            columns={[
              {
                key: "stage",
                header: t("reports.materialCost.columns.stage"),
                className: "font-bold text-card-foreground",
                cell: (r) => (
                  <>
                    {r.stageName}
                  </>
                ),
              },
              {
                key: "estimated",
                header: t("reports.materialCost.columns.estimated"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.estimatedOriginal} className="text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.estimatedOriginal} />
                  </>
                ),
              },
              {
                key: "revised",
                header: t("reports.materialCost.columns.revised"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.estimatedRevised} className="text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.estimatedRevised} />
                  </>
                ),
              },
              {
                key: "actual",
                header: t("reports.materialCost.columns.actual"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.actual} className="text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.actual} />
                  </>
                ),
              },
              {
                key: "variance",
                header: t("reports.materialCost.columns.variance"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.variance} className="font-bold text-card-foreground" />
                  </>
                ),
                total: (
                  <>
                    <Money amount={report.totals.variance} />
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
