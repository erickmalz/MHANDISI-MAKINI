import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getProcurementReport } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { POStatusBadge } from "../../procurement/_components/POStatusBadge";

/**
 * Procurement Report (guidelines §38, Phase 4 ticket 06) — every Purchase
 * Order against what the take-off requires. "Required" reuses the project's
 * already-computed material estimate; every order row reuses
 * `@/lib/procurement`'s existing pure derivations, the same ones the
 * Purchase Order screens already call — see `@/lib/data/reports.ts`.
 */
export default async function ProcurementReportPage({
  params,
}: PageProps<"/projects/[id]/reports/procurement">) {
  const { id } = await params;
  const report = await getProcurementReport(id);
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
          Procurement Report
        </h1>
        <p className="mt-1 text-muted-foreground">{report.projectName}</p>
      </header>

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Required" amount={report.required} />
        <StatTile label="Ordered" amount={report.totals.ordered} />
        <StatTile label="Delivered" amount={report.totals.delivered} />
        <StatTile label="Paid" amount={report.totals.paid} />
        <StatTile
          label="Outstanding"
          amount={report.totals.outstanding}
          tone={report.totals.outstanding > 0 ? "destructive" : undefined}
        />
      </Card>

      <Card>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Purchase Orders raised on this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Order</th>
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 font-bold">Supplier</th>
                  <th className="py-2 pr-4 text-right font-bold">Ordered</th>
                  <th className="py-2 pr-4 text-right font-bold">Delivered</th>
                  <th className="py-2 pr-4 text-right font-bold">Paid</th>
                  <th className="py-2 text-right font-bold">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.purchaseOrderId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/projects/${report.projectId}/procurement/${r.purchaseOrderId}`}
                        className="font-bold text-card-foreground hover:underline"
                      >
                        {r.displayNumber ?? "Draft"}
                      </Link>
                      <div className="mt-1">
                        <POStatusBadge status={r.status} size="sm" />
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.stageName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.supplierName}</td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.ordered} className="text-card-foreground" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Money amount={r.delivered} className="text-card-foreground" />
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
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
