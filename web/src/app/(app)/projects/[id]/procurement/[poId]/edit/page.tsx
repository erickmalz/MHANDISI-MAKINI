import { notFound } from "next/navigation";

import { updatePurchaseOrderAction } from "@/app/actions/procurement";
import { getPurchaseOrderDraftInput, listSuppliers } from "@/lib/data";
import { PurchaseOrderForm } from "../../../../_components/PurchaseOrderForm";
import { TaskSourceNote } from "../../../../_components/TaskSourceNote";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("procurement.editPageTitle");

export default async function EditPurchaseOrderPage({
  params,
}: PageProps<"/projects/[id]/procurement/[poId]/edit">) {
  const { id, poId } = await params;

  const t = await getT();
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
    <PageFrame width="reading">
      <PageHeader
        crumbs={[
          { label: t("procurement.pageTitle"), href: `/projects/${id}/procurement` },
          { label: t("procurement.detailPageTitle"), href: `/projects/${id}/procurement/${poId}` },
        ]}
        title={t("procurement.edit.title")}
        subtitle={t("procurement.edit.subtitle")}
      />

      {draft.sourceTaskId && (
        <TaskSourceNote projectId={id} taskId={draft.sourceTaskId} kind="procurement" />
      )}

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
        submitLabel={t("procurement.edit.saveDraft")}
        cancelHref={`/projects/${id}/procurement/${poId}`}
      />
    </PageFrame>
  );
}
