import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateVariationAction } from "@/app/actions/variations";
import { getVariationDraftInput } from "@/lib/data";
import { VariationForm } from "../../../../_components/VariationForm";

export default async function EditVariationPage({
  params,
}: PageProps<"/projects/[id]/variations/[variationId]/edit">) {
  const { id, variationId } = await params;
  const draft = await getVariationDraftInput(variationId);
  if (!draft || draft.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/variations/${variationId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Variation
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Edit Variation draft
      </h1>

      <VariationForm
        action={updateVariationAction.bind(null, id, draft.stageId, variationId)}
        fixedTaskDescription={draft.taskDescription}
        initial={draft}
        submitLabel="Save changes"
        cancelHref={`/projects/${id}/variations/${variationId}`}
      />
    </main>
  );
}
