
import { createSupplierAction } from "@/app/actions/suppliers";
import { SupplierForm } from "../_components/SupplierForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("suppliers.new.pageTitle");

export default async function NewSupplierPage() {
  const t = await getT();
  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("suppliers.crumbProjects"), href: "/" }, { label: t("suppliers.crumbRegister"), href: "/suppliers" }]}
        title={t("suppliers.new.title")}
        subtitle={t("suppliers.new.subtitle")}
      />

      <SupplierForm
        action={createSupplierAction}
        submitLabel={t("suppliers.new.submit")}
        cancelHref="/suppliers"
      />
    </PageFrame>
  );
}
