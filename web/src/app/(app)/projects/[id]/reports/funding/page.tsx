import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getFundingReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { FRStatusBadge } from "../../funding/_components/FRStatusBadge";

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
        <h1 className="text-[1.75rem] font-bold text-foreground">Funding Report</h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card className="mb-6 grid grid-cols-3 gap-4">
        <StatTile label="Requested" amount={report.totals.requested} />
        <StatTile label="Deposited" amount={report.totals.deposited} />
        <StatTile
          label="Balance"
          amount={report.totals.balance}
          tone={report.totals.balance > 0 ? "destructive" : undefined}
        />
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Funding Requests raised on this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Request</th>
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 text-right font-bold">Requested</th>
                  <th className="py-2 pr-4 text-right font-bold">Deposited</th>
                  <th className="py-2 text-right font-bold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.fundingRequestId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/projects/${report.projectId}/funding/${r.fundingRequestId}`}
                        className="font-bold text-card-foreground hover:underline"
                      >
                        {r.displayNumber ?? "Draft"}
                      </Link>
                      {r.kind === "additional" && (
                        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                          Additional
                        </span>
                      )}
                      <div className="mt-1">
                        <FRStatusBadge status={r.status} size="sm" />
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.stageName}</td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.amountRequested} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.amountDeposited} className="text-card-foreground" />
                    </td>
                    <td className="py-2 text-right">
                      <Money amount={r.balance} className="font-bold text-card-foreground" />
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
