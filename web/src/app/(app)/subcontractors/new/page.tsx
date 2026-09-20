
import { createSubcontractorAction } from "@/app/actions/subcontractors";
import { SubcontractorForm } from "../_components/SubcontractorForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("subcontractors.new.pageTitle");

export default async function NewSubcontractorPage() {
  const t = await getT();
  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("subcontractors.crumbProjects"), href: "/" }, { label: t("subcontractors.crumbRegister"), href: "/subcontractors" }]}
        title={t("subcontractors.new.title")}
        subtitle={t("subcontractors.new.subtitle")}
      />

      <SubcontractorForm
        action={createSubcontractorAction}
        submitLabel={t("subcontractors.new.submit")}
        cancelHref="/subcontractors"
      />
    </PageFrame>
  );
}
