import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getProjectOverview, listPurchaseOrders } from "@/lib/data";
import {
  derivePOStatus,
  orderedTotal,
  acceptedValue,
  paidTotal,
} from "@/lib/procurement";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { POStatusBadge } from "./_components/POStatusBadge";

export default async function ProcurementPage({ params }: PageProps<"/projects/[id]/procurement">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const orders = await listPurchaseOrders(project.id);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-foreground">Purchase orders</h1>
          <p className="mt-1 text-muted-foreground">
            Ordered, delivered, and paid are tracked separately for every
            material commitment.
          </p>
        </div>
        <Button variant="primary" href={`/projects/${project.id}/procurement/new`}>
          <Plus size={20} aria-hidden="true" />
          Create purchase order
        </Button>
      </header>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          No purchase orders yet. Create the first one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((po) => {
            const status = derivePOStatus(po);
            const ordered = orderedTotal(po);
            const delivered = acceptedValue(po);
            const paid = paidTotal(po);
            return (
              <Link
                key={po.id}
                href={`/projects/${project.id}/procurement/${po.id}`}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-card-foreground">
                      {po.displayNumber ?? "Draft"}
                    </span>
                    <POStatusBadge status={status} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {po.stageName} &middot; {po.supplierName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-6 sm:text-right">
                  <MiniStat label="Ordered" amount={ordered} />
                  <MiniStat label="Delivered" amount={delivered} />
                  <MiniStat label="Paid" amount={paid} />
                </div>
                <CaretRight
                  size={18}
                  className="hidden shrink-0 text-muted-foreground sm:block"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function MiniStat({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Money
        amount={amount}
        className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
      />
    </div>
  );
}
