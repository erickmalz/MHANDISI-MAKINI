import { notFound } from "next/navigation";

import { createStageAction } from "@/app/actions/stages";
import { getProjectOverview } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { StageForm } from "../../../_components/StageForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("stages.new.pageTitle");

export default async function NewStagePage({
  params,
}: PageProps<"/projects/[id]/stages/new">) {
  const { id } = await params;
  const t = await getT();
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const nextSeq = project.stages.length + 1;

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }]}
        title={t("stages.new.title")}
        subtitle={nextSeq === 1 ? t("stages.new.subtitleFirst") : t("stages.new.subtitleNext", { seq: nextSeq })}
      />

      <StageForm
        action={createStageAction.bind(null, id)}
        seq={nextSeq}
        submitLabel={t("stages.new.submit")}
        cancelHref={`/projects/${id}`}
      />
    </PageFrame>
  );
}
