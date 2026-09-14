import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createTemplateFromProjectAction } from "@/app/actions/stage-templates";
import { getProjectOverview } from "@/lib/data";
import { SaveAsTemplateForm } from "./_components/SaveAsTemplateForm";

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
  const project = await getProjectOverview(id);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">
        Save as template
      </h1>
      <p className="mb-6 text-muted-foreground">
        Copies every stage and task name, and every material&rsquo;s name and
        unit, into a new template. No amounts, quantities, or client details
        come with it, and this project is not linked to the template
        afterwards.
      </p>

      <SaveAsTemplateForm
        action={createTemplateFromProjectAction.bind(null, id)}
        defaultName={project.name}
        cancelHref={`/projects/${id}`}
      />
    </main>
  );
}
