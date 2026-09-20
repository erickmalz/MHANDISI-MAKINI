import Link from "next/link";
import { notFound } from "next/navigation";

import { getVariationReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { VariationStatusBadge } from "../../variations/_components/VariationStatusBadge";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/types";

/** The data layer's English funding-status text -> its label key; unknown values show as stored. */
const FUNDING_STATUS: Record<string, MessageKey> = {
  "Not applicable": "reports.variations.fundingStatus.notApplicable",
  "Not linked to a funding request": "reports.variations.fundingStatus.notLinked",
  "Funding request pending": "reports.variations.fundingStatus.pending",
  Funded: "reports.variations.fundingStatus.funded",
};

export const generateMetadata = pageTitle("reports.variations.pageTitle");

/**
 * Variation Report (guidelines §38, Phase 4 ticket 06) — every Variation's
 * scope impact, additional cost, approval status and funding status, across
 * every stage of the project. Reuses `listVariationsForStage` (Phase 3
 * ticket 01) once per stage — see `@/lib/data/reports.ts`'s
 * `getVariationReport`.
 */
export default async function VariationReportPage({
  params,
}: PageProps<"/projects/[id]/reports/variations">) {
  const { id } = await params;
  const report = await getVariationReport(id);
  if (!report) notFound();
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
        title={t("reports.variations.label")}
      />

      <Card className="mb-6 max-w-xs">
        <StatTile
          label={t("reports.variations.totalAdditional")}
          amount={report.totals.additionalCostApproved}
          emphasis
        />
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("reports.variations.empty")}
          </p>
        ) : (
          <DataTable
            caption={t("reports.variations.caption")}
            rows={report.rows}
            rowKey={(r) => r.variationId}
            columns={[
              {
                key: "variation",
                header: t("reports.variations.columns.variation"),
                cell: (r) => (
                  <>
                    <Link
                      href={`/projects/${report.projectId}/variations/${r.variationId}`}
                      className="font-bold text-card-foreground hover:underline"
                    >
                      {r.variationLabel}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {r.stageName} &middot; {r.taskDescription}
                    </p>
                  </>
                ),
              },
              {
                key: "scope-impact",
                header: t("reports.variations.columns.scopeImpact"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.scopeImpact}
                  </>
                ),
              },
              {
                key: "additional-cost",
                header: t("reports.variations.columns.additionalCost"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.additionalCost} className="font-bold text-card-foreground" />
                  </>
                ),
              },
              {
                key: "approval-status",
                header: t("reports.variations.columns.approvalStatus"),
                cell: (r) => (
                  <>
                    <VariationStatusBadge status={r.approvalStatus} size="sm" />
                  </>
                ),
              },
              {
                key: "funding-status",
                header: t("reports.variations.columns.fundingStatus"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {FUNDING_STATUS[r.fundingStatus]
                      ? t(FUNDING_STATUS[r.fundingStatus])
                      : r.fundingStatus}
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
