import { notFound } from "next/navigation";

import { updateSupplierAction } from "@/app/actions/suppliers";
import { getSupplierInput } from "@/lib/data";
import { SupplierForm } from "../../_components/SupplierForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("suppliers.edit.pageTitle");

export default async function EditSupplierPage({
  params,
}: PageProps<"/suppliers/[id]/edit">) {
  const { id } = await params;
  const [supplier, t] = await Promise.all([getSupplierInput(id), getT()]);
  if (!supplier) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("suppliers.crumbProjects"), href: "/" }, { label: t("suppliers.crumbRegister"), href: "/suppliers" }]}
        title={t("suppliers.edit.title", { name: supplier.name })}
      />

      <SupplierForm
        action={updateSupplierAction.bind(null, id)}
        initial={supplier}
        submitLabel={t("suppliers.edit.submit")}
        cancelHref="/suppliers"
      />
    </PageFrame>
  );
}
