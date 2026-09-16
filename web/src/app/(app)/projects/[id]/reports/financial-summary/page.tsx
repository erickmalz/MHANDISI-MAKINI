import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getProjectFinancialSummary } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { HealthBadge } from "@/components/ui/HealthBadge";

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
}: PageProps<"/projects/[id]/reports/financial-summary">) {
  const { id } = await params;
  const report = await getProjectFinancialSummary(id);
  if (!report) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${report.projectId}/reports`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Reports
      </Link>

      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{report.projectCode}</p>
        <h1 className="text-[1.75rem] font-bold text-foreground">
          Project Financial Summary
        </h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Funding requested" amount={report.fundingRequested} />
        <StatTile label="Funding received" amount={report.fundingReceived} />
        <StatTile label="Fees invoiced" amount={report.feesInvoiced} />
        <StatTile label="Fees received" amount={report.feesReceived} />
        <StatTile label="Fees outstanding" amount={report.feesOutstanding} />
        <StatTile label="Commitments" amount={report.commitments} />
        <StatTile label="Payments" amount={report.payments} />
        <StatTile
          label="Available float"
          amount={report.availableFloat}
          tone={report.availableFloat < 0 ? "destructive" : undefined}
        />
        <StatTile
          label="Forecast shortfall"
          amount={report.forecastShortfall}
          emphasis
          tone={report.forecastShortfall > 0 ? "destructive" : undefined}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-card-foreground">
          Stage by stage
        </h2>
        {report.stages.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This project has no stages yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 font-bold">Health</th>
                  <th className="py-2 pr-4 text-right font-bold">Client deposits</th>
                  <th className="py-2 pr-4 text-right font-bold">Commitments</th>
                  <th className="py-2 pr-4 text-right font-bold">Payments</th>
                  <th className="py-2 pr-4 text-right font-bold">Available float</th>
                  <th className="py-2 text-right font-bold">Forecast requirement</th>
                </tr>
              </thead>
              <tbody>
                {report.stages.map((s) => (
                  <tr key={s.stageId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <p className="font-bold text-card-foreground">{s.stageName}</p>
                      <p className="text-xs text-muted-foreground">{s.status}</p>
                    </td>
                    <td className="py-2 pr-4">
                      <HealthBadge health={s.health} size="sm" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={s.clientDeposits} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={s.commitments} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={s.payments} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={s.availableFloat} className="text-card-foreground" />
                    </td>
                    <td className="py-2 text-right">
                      <Money
                        amount={s.forecastFundingRequirement}
                        className="text-card-foreground"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
