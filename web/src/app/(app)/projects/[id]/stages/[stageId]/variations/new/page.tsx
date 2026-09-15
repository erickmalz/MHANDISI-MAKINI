import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createVariationAction } from "@/app/actions/variations";
import { getStageDetail } from "@/lib/data";
import { VariationForm } from "../../../../../_components/VariationForm";

export default async function NewVariationPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/variations/new">) {
  const { id, stageId } = await params;
  const stage = await getStageDetail(stageId);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.name}
      </Link>

      <h1 className="mb-2 text-[1.75rem] font-bold text-foreground">
        Raise a Variation
      </h1>
      <p className="mb-6 max-w-prose text-muted-foreground">
        A formally logged scope change against one of this stage&rsquo;s
        tasks. It stays a Draft — with no number and no effect on the
        budget — until you Approve it.
      </p>

      {stage.tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          This stage has no tasks yet. When the scope change does not fit any
          existing task, add the new task first, then raise the Variation
          against it.
        </p>
      ) : (
        <VariationForm
          action={createVariationAction.bind(null, id, stageId)}
          tasks={stage.tasks.map((t) => ({
            id: t.id,
            seq: t.seq,
            description: t.description,
          }))}
          submitLabel="Save draft"
          cancelHref={`/projects/${id}/stages/${stageId}`}
        />
      )}
    </main>
  );
}
