import { notFound } from "next/navigation";

import { updateStageTemplateAction } from "@/app/actions/stage-templates";
import { getStageTemplateInput } from "@/lib/data";
import { StageTemplateForm } from "../../_components/StageTemplateForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("stageTemplates.edit.pageTitle");

export default async function EditStageTemplatePage({
  params,
}: PageProps<"/stage-templates/[id]/edit">) {
  const { id } = await params;
  const [template, t] = await Promise.all([getStageTemplateInput(id), getT()]);
  if (!template) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stageTemplates.crumbProjects"), href: "/" }, { label: t("stageTemplates.crumbRegister"), href: "/stage-templates" }]}
        title={t("stageTemplates.edit.title", { name: template.name })}
        subtitle={t("stageTemplates.edit.subtitle")}
      />

      <StageTemplateForm
        action={updateStageTemplateAction.bind(null, id)}
        initial={template}
        submitLabel={t("stageTemplates.edit.submit")}
        cancelHref="/stage-templates"
      />
    </PageFrame>
  );
}
