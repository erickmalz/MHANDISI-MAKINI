import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateProjectAction } from "@/app/actions/projects";
import { getProjectInput } from "@/lib/data";
import { ProjectForm } from "../../_components/ProjectForm";

export default async function EditProjectPage({
  params,
}: PageProps<"/projects/[id]/edit">) {
  const { id } = await params;
  const project = await getProjectInput(id);
  if (!project) notFound();

  const { projectCode, ...initial } = project;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {initial.name}
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">Edit project</h1>

      <ProjectForm
        action={updateProjectAction.bind(null, id)}
        initial={initial}
        projectCode={projectCode}
        submitLabel="Save changes"
        cancelHref={`/projects/${id}`}
      />
    </main>
  );
}
