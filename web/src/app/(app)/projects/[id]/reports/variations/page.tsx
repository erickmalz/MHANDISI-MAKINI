import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getVariationReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { VariationStatusBadge } from "../../variations/_components/VariationStatusBadge";

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
        <h1 className="text-[1.75rem] font-bold text-foreground">Variation Report</h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card className="mb-6 max-w-xs">
        <StatTile
          label="Total additional cost (approved)"
          amount={report.totals.additionalCostApproved}
          emphasis
        />
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Variations logged on this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Variation</th>
                  <th className="py-2 pr-4 font-bold">Scope impact</th>
                  <th className="py-2 pr-4 text-right font-bold">Additional cost</th>
                  <th className="py-2 pr-4 font-bold">Approval status</th>
                  <th className="py-2 font-bold">Funding status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.variationId} className="border-b border-border last:border-0 align-top">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/projects/${report.projectId}/variations/${r.variationId}`}
                        className="font-bold text-card-foreground hover:underline"
                      >
                        {r.variationLabel}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.stageName} &middot; {r.taskDescription}
                      </p>
                    </td>
                    <td className="py-2 pr-4 max-w-xs text-muted-foreground">
                      {r.scopeImpact}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.additionalCost} className="font-bold text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4">
                      <VariationStatusBadge status={r.approvalStatus} size="sm" />
                    </td>
                    <td className="py-2 text-muted-foreground">{r.fundingStatus}</td>
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
