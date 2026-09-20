import { createProjectAction } from "@/app/actions/projects";
import { listStageTemplatesForApply } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { ProjectForm } from "../_components/ProjectForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("project.new.pageTitle");

export default async function NewProjectPage() {
  const t = await getT();
  const templates = await listStageTemplatesForApply();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("project.crumbs.projects"), href: "/" }]}
        title={t("project.new.title")}
        subtitle={t("project.new.subtitle")}
      />

      <ProjectForm
        action={createProjectAction}
        templates={templates}
        submitLabel={t("project.new.submit")}
        cancelHref="/"
      />
    </PageFrame>
  );
}
