import { notFound } from "next/navigation";

import { createTemplateFromProjectAction } from "@/app/actions/stage-templates";
import { getProjectOverview } from "@/lib/data";
import { SaveAsTemplateForm } from "./_components/SaveAsTemplateForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("closeout.saveAsTemplate.pageTitle");

/**
 * "Save as template" (Operational Control decision 2) — copies this
 * project's stages'/tasks'/material lines' names and units into a new Stage
 * Template, dropping every number. One button beyond the blank-template
 * write path it reuses.
 */
export default async function SaveAsTemplatePage({
  params,
}: PageProps<"/projects/[id]/save-as-template">) {
  const { id } = await params;
  const [project, t] = await Promise.all([getProjectOverview(id), getT()]);
  if (!project) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("closeout.crumbOverview"), href: `/projects/${id}` }]}
        title={t("closeout.saveAsTemplate.pageTitle")}
        subtitle={t("closeout.saveAsTemplate.subtitle")}
      />

      <SaveAsTemplateForm
        action={createTemplateFromProjectAction.bind(null, id)}
        defaultName={project.name}
        cancelHref={`/projects/${id}`}
      />
    </PageFrame>
  );
}
