
import { createStageTemplateAction } from "@/app/actions/stage-templates";
import { StageTemplateForm } from "../_components/StageTemplateForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("stageTemplates.new.pageTitle");

export default async function NewStageTemplatePage() {
  const t = await getT();
  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stageTemplates.crumbProjects"), href: "/" }, { label: t("stageTemplates.crumbRegister"), href: "/stage-templates" }]}
        title={t("stageTemplates.new.title")}
        subtitle={t("stageTemplates.new.subtitle")}
      />

      <StageTemplateForm
        action={createStageTemplateAction}
        submitLabel={t("stageTemplates.new.submit")}
        cancelHref="/stage-templates"
      />
    </PageFrame>
  );
}
