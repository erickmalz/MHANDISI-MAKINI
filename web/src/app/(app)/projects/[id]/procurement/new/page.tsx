import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createPurchaseOrderAction } from "@/app/actions/procurement";
import { getProjectOverview, listSuppliers } from "@/lib/data";
import { PurchaseOrderForm } from "../../../_components/PurchaseOrderForm";

export default async function NewPurchaseOrderPage({
  params,
}: PageProps<"/projects/[id]/procurement/new">) {
  const { id } = await params;
  const [project, suppliers] = await Promise.all([
    getProjectOverview(id),
    listSuppliers(),
  ]);
  if (!project) notFound();

  const orderableStages = project.stages.filter(
    (s) => s.status !== "Completed" && s.status !== "Cancelled",
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}/procurement`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Purchase orders
      </Link>

      <h1 className="mb-2 text-[1.75rem] font-bold text-foreground">
        Create purchase order
      </h1>
      <p className="mb-6 max-w-prose text-muted-foreground">
        Enter the material lines and pick the supplier. Issuing the order freezes
        the supplier, lines and unit prices, and assigns its number.
      </p>

      {orderableStages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          This project has no stage that can take a purchase order yet. Add a
          stage first.
        </p>
      ) : suppliers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          Add a supplier to the{" "}
          <Link href="/suppliers/new" className="font-bold underline">
            Supplier Register
          </Link>{" "}
          before raising a purchase order.
        </p>
      ) : (
        <PurchaseOrderForm
          action={createPurchaseOrderAction.bind(null, id)}
          stages={orderableStages.map((s) => ({
            id: s.id,
            name: s.name,
            seq: s.seq,
            status: s.status,
          }))}
          defaultStageId={project.currentStageId ?? undefined}
          suppliers={suppliers
            .filter((s) => s.status === "active")
            .map((s) => ({ id: s.id, name: s.name, status: s.status }))}
          submitLabel="Save draft"
          cancelHref={`/projects/${id}/procurement`}
        />
      )}
    </main>
  );
}
