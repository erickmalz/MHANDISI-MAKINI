import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getLabourReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";

/**
 * Labour Report (guidelines §38, Phase 4 ticket 06) — every Task's
 * Subcontractor, agreed and revised labour agreement, paid and outstanding,
 * across the whole project. See `@/lib/data/reports.ts`'s
 * `getLabourReport` for the one genuinely new query this ticket needed.
 */
export default async function LabourReportPage({
  params,
}: PageProps<"/projects/[id]/reports/labour">) {
  const { id } = await params;
  const report = await getLabourReport(id);
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
        <h1 className="text-[1.75rem] font-bold text-foreground">Labour Report</h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Tasks recorded on this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Task</th>
                  <th className="py-2 pr-4 font-bold">Subcontractor</th>
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 text-right font-bold">Agreed</th>
                  <th className="py-2 pr-4 text-right font-bold">Revised</th>
                  <th className="py-2 pr-4 text-right font-bold">Paid</th>
                  <th className="py-2 text-right font-bold">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.taskId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/projects/${report.projectId}/tasks/${r.taskId}/edit`}
                        className="font-bold text-card-foreground hover:underline"
                      >
                        {r.taskDescription}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.status}</p>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {r.subcontractorName}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.stageName}</td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.agreed} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {r.revised != null ? (
                        <Money amount={r.revised} className="text-card-foreground" />
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.paid} className="text-card-foreground" />
                    </td>
                    <td className="py-2 text-right">
                      <Money amount={r.outstanding} className="font-bold text-card-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold text-card-foreground">
                  <td className="py-2 pr-4" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.agreed} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.revised} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Money amount={report.totals.paid} />
                  </td>
                  <td className="py-2 text-right">
                    <Money amount={report.totals.outstanding} />
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
