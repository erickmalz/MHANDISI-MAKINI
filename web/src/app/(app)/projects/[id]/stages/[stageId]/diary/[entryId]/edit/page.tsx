import { notFound } from "next/navigation";

import { updateSiteDiaryEntryAction } from "@/app/actions/site-diary";
import { getSiteDiaryEntry, getStageDetail } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { SiteDiaryEntryForm } from "../../../../../../_components/SiteDiaryEntryForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("stages.diary.editPage.pageTitle");

export default async function EditSiteDiaryEntryPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/diary/[entryId]/edit">) {
  const { id, stageId, entryId } = await params;
  const t = await getT();

  const [stage, entry] = await Promise.all([
    getStageDetail(stageId),
    getSiteDiaryEntry(entryId),
  ]);
  if (!stage || stage.projectId !== id) notFound();
  if (!entry || entry.stageId !== stageId) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("stages.diary.editPage.title")}
        subtitle={stage.name}
      />

      <SiteDiaryEntryForm
        action={updateSiteDiaryEntryAction.bind(null, id, stageId, entryId)}
        initial={{
          entryDate: entry.entryDate,
          weather: entry.weather ?? undefined,
          workersOnSite: entry.workersOnSite ?? undefined,
          activities: entry.activities ?? undefined,
          materialsUsed: entry.materialsUsed ?? undefined,
          equipmentUsed: entry.equipmentUsed ?? undefined,
          delays: entry.delays ?? undefined,
          issues: entry.issues ?? undefined,
          instructions: entry.instructions ?? undefined,
          visitors: entry.visitors ?? undefined,
          notes: entry.notes ?? undefined,
        }}
        submitLabel={t("stages.diary.editPage.submit")}
        cancelHref={`/projects/${id}/stages/${stageId}`}
      />
    </PageFrame>
  );
}
