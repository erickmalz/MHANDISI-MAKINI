import { notFound } from "next/navigation";

import { createTaskAction } from "@/app/actions/tasks";
import {
  getStageDetail,
  getStockBalances,
  listKnownMaterialItems,
  listSubcontractors,
} from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { TaskForm } from "../../../../../_components/TaskForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";

export const generateMetadata = pageTitle("tasks.new.pageTitle");

export default async function NewTaskPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/tasks/new">) {
  const { id, stageId } = await params;
  const t = await getT();

  const [stage, subcontractors, stockBalances, knownItems] = await Promise.all([
    getStageDetail(stageId),
    listSubcontractors(),
    getStockBalances(id),
    listKnownMaterialItems(),
  ]);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("tasks.new.title")}
        subtitle={t("tasks.new.subtitle", { seq: stage.tasks.length + 1, stage: stage.name })}
      />

      <TaskForm
        action={createTaskAction.bind(null, id, stageId)}
        subcontractors={subcontractors
          .filter((s) => s.status === "active")
          .map((s) => ({ id: s.id, name: s.name }))}
        seq={stage.tasks.length + 1}
        submitLabel={t("tasks.new.submit")}
        cancelHref={`/projects/${id}/stages/${stageId}`}
        stockBalances={stockBalances}
        knownItems={knownItems}
      />
    </PageFrame>
  );
}
