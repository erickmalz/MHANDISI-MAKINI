import { notFound } from "next/navigation";

import {
  approveVariationAction,
  cancelVariationAction,
  deleteVariationDraftAction,
  rejectVariationAction,
} from "@/app/actions/variations";
import { getVariation } from "@/lib/data";
import { VariationDetail } from "./_components/VariationDetail";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("variations.pageTitle");

export default async function VariationDetailPage({
  params,
}: PageProps<"/projects/[id]/variations/[variationId]">) {
  const { id, variationId } = await params;
  const t = await getT();
  const variation = await getVariation(variationId);
  if (!variation || variation.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("variations.crumbOverview"), href: `/projects/${id}` }]}
        title={
          variation.displayNumber
            ? t("variations.detailTitle", { number: variation.displayNumber })
            : t("variations.detailTitleDraft")
        }
      />

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
    </PageFrame>
  );
}
