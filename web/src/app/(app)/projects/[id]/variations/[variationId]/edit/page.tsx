import { notFound } from "next/navigation";

import { updateVariationAction } from "@/app/actions/variations";
import { getVariationDraftInput } from "@/lib/data";
import { VariationForm } from "../../../../_components/VariationForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("variations.editPageTitle");

export default async function EditVariationPage({
  params,
}: PageProps<"/projects/[id]/variations/[variationId]/edit">) {
  const { id, variationId } = await params;
  const t = await getT();
  const draft = await getVariationDraftInput(variationId);
  if (!draft || draft.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[
          { label: t("variations.crumbOverview"), href: `/projects/${id}` },
          { label: t("variations.pageTitle"), href: `/projects/${id}/variations/${variationId}` },
        ]}
        title={t("variations.edit.title")}
      />

      <VariationForm
        action={updateVariationAction.bind(null, id, draft.stageId, variationId)}
        fixedTaskDescription={draft.taskDescription}
        initial={draft}
        submitLabel={t("variations.edit.save")}
        cancelHref={`/projects/${id}/variations/${variationId}`}
      />
    </PageFrame>
  );
}
