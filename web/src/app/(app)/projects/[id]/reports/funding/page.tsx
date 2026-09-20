import Link from "next/link";
import { notFound } from "next/navigation";

import { getFundingReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { FRStatusBadge } from "../../funding/_components/FRStatusBadge";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("reports.funding.pageTitle");

/**
 * Funding Report (guidelines §38, Phase 4 ticket 06) — every Funding
 * Request, amount requested, amount deposited, balance and status. Pure
 * reuse of `listFundingRequests` and `@/lib/funding`'s existing derivations
 * — see `@/lib/data/reports.ts`'s `getFundingReport`.
 */
export default async function FundingReportPage({
  params,
}: PageProps<"/projects/[id]/reports/funding">) {
  const { id } = await params;
  const report = await getFundingReport(id);
  if (!report) notFound();
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("reports.pageTitle"), href: `/projects/${id}/reports` }]}
        title={t("reports.funding.label")}
      />

      <Card className="mb-6 grid grid-cols-3 gap-4">
        <StatTile label={t("reports.funding.requested")} amount={report.totals.requested} />
        <StatTile label={t("reports.funding.deposited")} amount={report.totals.deposited} />
        <StatTile
          label={t("reports.funding.balance")}
          amount={report.totals.balance}
          tone={report.totals.balance > 0 ? "destructive" : undefined}
        />
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("reports.funding.empty")}
          </p>
        ) : (
          <DataTable
            caption={t("reports.funding.caption")}
            rows={report.rows}
            rowKey={(r) => r.fundingRequestId}
            columns={[
              {
                key: "request",
                header: t("reports.funding.columns.request"),
                cell: (r) => (
                  <>
                    <Link
                      href={`/projects/${report.projectId}/funding/${r.fundingRequestId}`}
                      className="font-bold text-card-foreground hover:underline"
                    >
                      {r.displayNumber ?? t("funding.list.draft")}
                    </Link>
                    {r.kind === "additional" && (
                      <span className="ml-2"><StatusBadge tone="neutral" size="sm">
                        {t("reports.funding.additional")}
                      </StatusBadge></span>
                    )}
                    <div className="mt-1">
                      <FRStatusBadge status={r.status} size="sm" />
                    </div>
                  </>
                ),
              },
              {
                key: "stage",
                header: t("reports.funding.columns.stage"),
                className: "text-muted-foreground",
                cell: (r) => (
                  <>
                    {r.stageName}
                  </>
                ),
              },
              {
                key: "requested",
                header: t("reports.funding.columns.requested"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.amountRequested} className="text-card-foreground" />
                  </>
                ),
              },
              {
                key: "deposited",
                header: t("reports.funding.columns.deposited"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.amountDeposited} className="text-card-foreground" />
                  </>
                ),
              },
              {
                key: "balance",
                header: t("reports.funding.columns.balance"),
                align: "right",
                cell: (r) => (
                  <>
                    <Money amount={r.balance} className="font-bold text-card-foreground" />
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
