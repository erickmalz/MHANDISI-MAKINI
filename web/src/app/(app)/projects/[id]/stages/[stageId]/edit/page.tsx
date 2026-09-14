import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateStageAction } from "@/app/actions/stages";
import { getStageInput } from "@/lib/data";
import { StageForm } from "../../../../_components/StageForm";

export default async function EditStagePage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/edit">) {
  const { id, stageId } = await params;
  const stage = await getStageInput(stageId);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to project
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Edit stage — {stage.name}
      </h1>

      <StageForm
        action={updateStageAction.bind(null, id, stageId)}
        initial={stage}
        seq={stage.seq}
        submitLabel="Save changes"
        cancelHref={`/projects/${id}`}
      />
    </main>
  );
}
