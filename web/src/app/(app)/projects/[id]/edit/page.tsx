import { notFound } from "next/navigation";

import { updateProjectAction } from "@/app/actions/projects";
import { getProjectInput } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { ProjectForm } from "../../_components/ProjectForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("project.edit.pageTitle");

export default async function EditProjectPage({
  params,
}: PageProps<"/projects/[id]/edit">) {
  const { id } = await params;
  const t = await getT();
  const project = await getProjectInput(id);
  if (!project) notFound();

  const { projectCode, ...initial } = project;

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("project.crumbs.overview"), href: `/projects/${id}` }]}
        title={t("project.edit.title")}
      />

      <ProjectForm
        action={updateProjectAction.bind(null, id)}
        initial={initial}
        projectCode={projectCode}
        submitLabel={t("project.edit.submit")}
        cancelHref={`/projects/${id}`}
      />
    </PageFrame>
  );
}
