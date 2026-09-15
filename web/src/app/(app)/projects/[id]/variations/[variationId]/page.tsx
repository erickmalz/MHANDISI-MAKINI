import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import {
  approveVariationAction,
  cancelVariationAction,
  deleteVariationDraftAction,
  rejectVariationAction,
} from "@/app/actions/variations";
import { getVariation } from "@/lib/data";
import { VariationDetail } from "./_components/VariationDetail";

export default async function VariationDetailPage({
  params,
}: PageProps<"/projects/[id]/variations/[variationId]">) {
  const { id, variationId } = await params;
  const variation = await getVariation(variationId);
  if (!variation || variation.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${variation.stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {variation.stageName}
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">
        Variation {variation.displayNumber ?? "(Draft)"}
      </h1>

      <VariationDetail
        projectId={id}
        variation={variation}
        approveAction={approveVariationAction.bind(null, id, variation.stageId, variation.id)}
        rejectAction={rejectVariationAction.bind(null, id, variation.stageId, variation.id)}
        cancelAction={cancelVariationAction.bind(null, id, variation.stageId, variation.id)}
        deleteDraftAction={deleteVariationDraftAction.bind(
          null,
          id,
          variation.stageId,
          variation.id,
        )}
      />
    </main>
  );
}
