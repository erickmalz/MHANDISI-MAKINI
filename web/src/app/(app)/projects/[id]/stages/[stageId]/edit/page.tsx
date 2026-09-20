import { notFound } from "next/navigation";

import { updateStageAction } from "@/app/actions/stages";
import { getStageInput } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { StageForm } from "../../../../_components/StageForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("stages.edit.pageTitle");

export default async function EditStagePage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/edit">) {
  const { id, stageId } = await params;
  const t = await getT();
  const stage = await getStageInput(stageId);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("stages.edit.title", { name: stage.name })}
      />

      <StageForm
        action={updateStageAction.bind(null, id, stageId)}
        initial={stage}
        seq={stage.seq}
        submitLabel={t("stages.edit.submit")}
        cancelHref={`/projects/${id}`}
      />
    </PageFrame>
  );
}
