import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { getSupplierStatement } from "@/lib/data";
import { formatDate } from "@/lib/format";

/**
 * The Supplier Statement (Operational Control decision 5) — an always-live,
 * all-time, all-project view: every Purchase Order raised against this
 * Supplier, every Payment made, and the running Outstanding balance. Not a
 * rendered document (no PDF/JPG) — see the map for why.
 */
export default async function SupplierStatementPage({
  params,
}: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const statement = await getSupplierStatement(id);
  if (!statement) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/suppliers"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Supplier register
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-foreground">{statement.name}</h1>
          <p className="mt-1 text-muted-foreground">Statement of account, every project</p>
        </div>
        <Link
          href={`/suppliers/${id}/edit`}
          className="inline-flex min-h-12 items-center px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Edit details
        </Link>
      </header>

      <Card className="mb-6 flex items-center justify-between">
        <span className="text-lg font-bold text-card-foreground">Outstanding balance</span>
        <Money amount={statement.outstandingBalance} className="text-xl font-bold text-card-foreground" />
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-bold text-card-foreground">Orders</h2>
        {statement.orders.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No Purchase Orders yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.orders.map((o) => (
              <li
                key={o.purchaseOrderId}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${o.projectId}/procurement/${o.purchaseOrderId}`}
                  className="min-w-0 hover:underline"
                >
                  <span className="font-bold text-card-foreground">
                    {o.displayNumber ?? "Draft"}
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {o.projectName} — {o.stageName}
                  </span>
                </Link>
                <Money amount={o.orderedTotal} className="font-bold text-card-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-card-foreground">Payments</h2>
        {statement.payments.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${p.projectId}/procurement/${p.purchaseOrderId}`}
                  className="min-w-0 hover:underline"
                >
                  <span className="text-sm text-muted-foreground">{formatDate(p.paidOn)}</span>{" "}
                  <span className="font-bold text-card-foreground">
                    {p.displayNumber ?? "Draft"}
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">— {p.projectName}</span>
                </Link>
                <Money amount={p.amount} className="font-bold text-card-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
