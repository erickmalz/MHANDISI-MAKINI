import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updatePurchaseOrderAction } from "@/app/actions/procurement";
import { getPurchaseOrderDraftInput, listSuppliers } from "@/lib/data";
import { PurchaseOrderForm } from "../../../../_components/PurchaseOrderForm";

export default async function EditPurchaseOrderPage({
  params,
}: PageProps<"/projects/[id]/procurement/[poId]/edit">) {
  const { id, poId } = await params;

  const [draft, suppliers] = await Promise.all([
    getPurchaseOrderDraftInput(poId),
    listSuppliers(),
  ]);
  if (!draft || draft.projectId !== id) notFound();

  // Active suppliers, plus the currently-assigned one even if it has been
  // retired since the draft was created.
  const options = suppliers
    .filter((s) => s.status === "active" || s.id === draft.supplierId)
    .map((s) => ({ id: s.id, name: s.name, status: s.status }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/procurement/${poId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the draft
      </Link>

      <h1 className="mb-2 text-[1.75rem] font-bold text-foreground">
        Edit draft purchase order
      </h1>
      <p className="mb-6 max-w-prose text-muted-foreground">
        Adjust the supplier, lines and terms before issuing.
      </p>

      <PurchaseOrderForm
        action={updatePurchaseOrderAction.bind(null, id, poId)}
        fixedStageName={draft.stageName}
        suppliers={options}
        initial={{
          supplierId: draft.supplierId,
          expectedDeliveryOn: draft.expectedDeliveryOn,
          paymentTerms: draft.paymentTerms,
          notes: draft.notes,
          lines: draft.lines,
        }}
        submitLabel="Save draft"
        cancelHref={`/projects/${id}/procurement/${poId}`}
      />
    </main>
  );
}
