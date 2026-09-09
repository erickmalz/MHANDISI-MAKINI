import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createStageAction } from "@/app/actions/stages";
import { getProjectOverview } from "@/lib/data";
import { StageForm } from "../../../_components/StageForm";

export default async function NewStagePage({
  params,
}: PageProps<"/projects/[id]/stages/new">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const nextSeq = project.stages.length + 1;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">Add a stage</h1>
      <p className="mb-6 text-muted-foreground">
        {nextSeq === 1
          ? "This first stage becomes the one you're working."
          : `This will be stage ${nextSeq} in the sequence.`}
      </p>

      <StageForm
        action={createStageAction.bind(null, id)}
        seq={nextSeq}
        submitLabel="Add stage"
        cancelHref={`/projects/${id}`}
      />
    </main>
  );
}
