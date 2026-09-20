import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, CaretRight } from "@phosphor-icons/react/dist/ssr";
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
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("procurement.pageTitle");

export default async function ProcurementPage({ params }: PageProps<"/projects/[id]/procurement">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const orders = await listPurchaseOrders(project.id);
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        title={t("procurement.pageTitle")}
        subtitle={t("procurement.list.subtitle")}
        actions={
          <>
            <Button variant="primary" href={`/projects/${project.id}/procurement/new`}>
              <Plus size={20} aria-hidden="true" />
              {t("procurement.list.create")}
            </Button>
          </>
        }
      />

      {orders.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          {t("procurement.list.empty")}
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
                      {po.displayNumber ?? t("procurement.list.draft")}
                    </span>
                    <POStatusBadge status={status} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {po.stageName} &middot; {po.supplierName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-6 sm:text-right">
                  <MiniStat label={t("procurement.list.ordered")} amount={ordered} />
                  <MiniStat label={t("procurement.list.delivered")} amount={delivered} />
                  <MiniStat label={t("procurement.list.paid")} amount={paid} />
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
    </PageFrame>
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
