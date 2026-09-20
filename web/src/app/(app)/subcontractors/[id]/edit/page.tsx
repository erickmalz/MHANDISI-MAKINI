import { notFound } from "next/navigation";

import { updateSubcontractorAction } from "@/app/actions/subcontractors";
import { getSubcontractorInput } from "@/lib/data";
import { SubcontractorForm } from "../../_components/SubcontractorForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("subcontractors.edit.pageTitle");

export default async function EditSubcontractorPage({
  params,
}: PageProps<"/subcontractors/[id]/edit">) {
  const { id } = await params;
  const [subcontractor, t] = await Promise.all([getSubcontractorInput(id), getT()]);
  if (!subcontractor) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("subcontractors.crumbProjects"), href: "/" }, { label: t("subcontractors.crumbRegister"), href: "/subcontractors" }]}
        title={t("subcontractors.edit.title", { name: subcontractor.name })}
      />

      <SubcontractorForm
        action={updateSubcontractorAction.bind(null, id)}
        initial={subcontractor}
        submitLabel={t("subcontractors.edit.submit")}
        cancelHref="/subcontractors"
      />
    </PageFrame>
  );
}
