import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getMaterialCostReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";

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

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
          Material Cost Report
        </h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This project has no stages yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 text-right font-bold">Estimated</th>
                  <th className="py-2 pr-4 text-right font-bold">Revised</th>
                  <th className="py-2 pr-4 text-right font-bold">Actual</th>
                  <th className="py-2 text-right font-bold">Variance</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.stageId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-bold text-card-foreground">
                      {r.stageName}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.estimatedOriginal} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.estimatedRevised} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.actual} className="text-card-foreground" />
                    </td>
                    <td className="py-2 text-right">
                      <Money amount={r.variance} className="font-bold text-card-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold text-card-foreground">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.estimatedOriginal} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.estimatedRevised} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.actual} />
                  </td>
                  <td className="py-2 text-right">
                    <Money amount={report.totals.variance} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
