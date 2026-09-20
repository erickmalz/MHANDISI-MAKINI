import Link from "next/link";
import { notFound } from "next/navigation";

import { createPurchaseOrderAction } from "@/app/actions/procurement";
import { getProjectOverview, listSuppliers } from "@/lib/data";
import { PurchaseOrderForm } from "../../../_components/PurchaseOrderForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("procurement.newPageTitle");

export default async function NewPurchaseOrderPage({
  params,
}: PageProps<"/projects/[id]/procurement/new">) {
  const { id } = await params;
  const t = await getT();
  const [project, suppliers] = await Promise.all([
    getProjectOverview(id),
    listSuppliers(),
  ]);
  if (!project) notFound();

  const orderableStages = project.stages.filter(
    (s) => s.status !== "Completed" && s.status !== "Cancelled",
  );

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("procurement.pageTitle"), href: `/projects/${id}/procurement` }]}
        title={t("procurement.new.title")}
        subtitle={t("procurement.new.subtitle")}
      />

      {orderableStages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("procurement.new.noStage")}
        </p>
      ) : suppliers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("procurement.new.addSupplierBefore")}{" "}
          <Link href="/suppliers/new" className="font-bold underline">
            {t("procurement.new.supplierRegister")}
          </Link>{" "}
          {t("procurement.new.addSupplierAfter")}
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
          submitLabel={t("procurement.new.saveDraft")}
          cancelHref={`/projects/${id}/procurement`}
        />
      )}
    </PageFrame>
  );
}
