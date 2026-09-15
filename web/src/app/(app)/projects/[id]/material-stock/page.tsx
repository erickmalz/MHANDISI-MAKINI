import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { getProjectOverview, getStockBalances, listStockMovements } from "@/lib/data";
import { Card } from "@/components/ui/Card";

/**
 * Material Stock (Phase 3 ticket 06) — current on-hand balance per material
 * for this project, plus the ledger's own recent history for free (§1's
 * "where did this 40 bags of cement come from" audit trail). Read-only: the
 * only writes to this ledger are `carryForwardSurplus` (Stage Closeout) and
 * the Material Take-Off form's "Apply from stock" input — there is no
 * standalone "add stock" action here, matching ticket 06 §3.
 */

const REASON_LABELS: Record<string, string> = {
  carried_forward: "Carried forward",
  drawn_into_takeoff: "Applied to take-off",
  written_off: "Written off",
};

export default async function MaterialStockPage({
  params,
}: PageProps<"/projects/[id]/material-stock">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const [balances, movements] = await Promise.all([
    getStockBalances(id),
    listStockMovements(id),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold text-foreground">Material stock</h1>
        <p className="mt-1 text-muted-foreground">
          Material carried forward from a closed stage and not yet drawn back
          into a take-off or written off. A Material Take-Off checks this
          before asking for more.
        </p>
      </header>

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-card-foreground">On site</h2>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No surplus material has been carried forward yet on this project.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-bold">Item</th>
                  <th className="py-2 pr-4 font-bold">Unit</th>
                  <th className="py-2 text-right font-bold">On site</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={`${b.itemKey}::${b.unit}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 capitalize text-card-foreground">{b.itemKey}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{b.unit}</td>
                    <td className="py-2 text-right font-bold text-card-foreground">{b.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-card-foreground">Recent movements</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock movements recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate capitalize text-card-foreground">
                    {m.itemKey} <span className="text-muted-foreground">({m.unit})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {REASON_LABELS[m.reason] ?? m.reason} &middot;{" "}
                    {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold ${m.qty >= 0 ? "text-health-green" : "text-destructive"}`}
                >
                  {m.qty >= 0 ? "+" : ""}
                  {m.qty}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
