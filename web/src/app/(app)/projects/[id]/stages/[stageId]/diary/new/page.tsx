import { notFound } from "next/navigation";

import { createSiteDiaryEntryAction } from "@/app/actions/site-diary";
import { getStageDetail } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { SiteDiaryEntryForm } from "../../../../../_components/SiteDiaryEntryForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("stages.diary.newPage.pageTitle");

export default async function NewSiteDiaryEntryPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/diary/new">) {
  const { id, stageId } = await params;
  const t = await getT();

  const stage = await getStageDetail(stageId);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("stages.diary.newPage.title")}
        subtitle={t("stages.diary.newPage.subtitle", { stage: stage.name })}
      />

      <SiteDiaryEntryForm
        action={createSiteDiaryEntryAction.bind(null, id, stageId)}
        submitLabel={t("stages.diary.newPage.submit")}
        cancelHref={`/projects/${id}/stages/${stageId}`}
      />
    </PageFrame>
  );
}
