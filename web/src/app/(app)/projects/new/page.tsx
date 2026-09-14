import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createProjectAction } from "@/app/actions/projects";
import { listStageTemplatesForApply } from "@/lib/data";
import { ProjectForm } from "../_components/ProjectForm";

export default async function NewProjectPage() {
  const templates = await listStageTemplatesForApply();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Choose a project
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">New project</h1>
      <p className="mb-6 text-muted-foreground">
        The project number is assigned automatically. You can add stages once the
        project exists.
      </p>

      <ProjectForm
        action={createProjectAction}
        templates={templates}
        submitLabel="Create project"
        cancelHref="/"
      />
    </main>
  );
}
