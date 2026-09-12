import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import {
  cancelPurchaseOrderAction,
  closePurchaseOrderAction,
  deletePurchaseOrderDraftAction,
  issuePurchaseOrderAction,
  recordDeliveryAction,
  recordPaymentAction,
  recordSupplierAckAction,
  reopenPurchaseOrderAction,
  voidDeliveryAction,
  voidPaymentAction,
} from "@/app/actions/procurement";
import { getAttachmentMeta, getPurchaseOrder } from "@/lib/data";
import { AttachmentCard } from "./_components/AttachmentCard";
import { PurchaseOrderDetail } from "./_components/PurchaseOrderDetail";

export default async function PurchaseOrderPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/procurement/[poId]">) {
  const { id, poId } = await params;
  const { issue_error } = await searchParams;

  const [po, attachment] = await Promise.all([
    getPurchaseOrder(poId),
    getAttachmentMeta("purchaseOrder", poId),
  ]);
  if (!po || po.projectId !== id) notFound();

  const voidDeliveryActions = Object.fromEntries(
    po.deliveries.map((d) => [
      d.id,
      voidDeliveryAction.bind(null, id, po.id, d.id),
    ]),
  );
  const voidPaymentActions = Object.fromEntries(
    po.payments.map((p) => [
      p.id,
      voidPaymentAction.bind(null, id, po.id, p.id),
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/procurement`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Purchase orders
      </Link>

      <PurchaseOrderDetail
        po={po}
        projectId={id}
        issueAction={issuePurchaseOrderAction.bind(null, id, po.id)}
        issueError={typeof issue_error === "string" ? issue_error : undefined}
        discardAction={deletePurchaseOrderDraftAction.bind(null, id, po.id)}
        editHref={`/projects/${id}/procurement/${po.id}/edit`}
        deliveryAction={recordDeliveryAction.bind(null, id, po.id)}
        paymentAction={recordPaymentAction.bind(null, id, po.id)}
        ackAction={recordSupplierAckAction.bind(null, id, po.id)}
        cancelAction={cancelPurchaseOrderAction.bind(null, id, po.id)}
        closeAction={closePurchaseOrderAction.bind(null, id, po.id)}
        reopenAction={reopenPurchaseOrderAction.bind(null, id, po.id)}
        voidDeliveryActions={voidDeliveryActions}
        voidPaymentActions={voidPaymentActions}
      />

      <div className="mt-6">
        <AttachmentCard projectId={id} poId={po.id} attachment={attachment} />
      </div>
    </main>
  );
}
