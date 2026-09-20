import { notFound } from "next/navigation";

import { createVariationAction } from "@/app/actions/variations";
import { getStageDetail } from "@/lib/data";
import { VariationForm } from "../../../../../_components/VariationForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("variations.newPageTitle");

export default async function NewVariationPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/variations/new">) {
  const { id, stageId } = await params;
  const t = await getT();
  const stage = await getStageDetail(stageId);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[
          { label: t("variations.crumbOverview"), href: `/projects/${id}` },
          { label: stage.name, href: `/projects/${id}/stages/${stageId}` },
        ]}
        title={t("variations.new.title")}
        subtitle={t("variations.new.subtitle")}
      />

      {stage.tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("variations.new.noTasks")}
        </p>
      ) : (
        <VariationForm
          action={createVariationAction.bind(null, id, stageId)}
          tasks={stage.tasks.map((task) => ({
            id: task.id,
            seq: task.seq,
            description: task.description,
          }))}
          submitLabel={t("variations.new.saveDraft")}
          cancelHref={`/projects/${id}/stages/${stageId}`}
        />
      )}
    </PageFrame>
  );
}
