import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createTaskAction } from "@/app/actions/tasks";
import {
  getStageDetail,
  getStockBalances,
  listKnownMaterialItems,
  listSubcontractors,
} from "@/lib/data";
import { TaskForm } from "../../../../../_components/TaskForm";

export default async function NewTaskPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/tasks/new">) {
  const { id, stageId } = await params;

  const [stage, subcontractors, stockBalances, knownItems] = await Promise.all([
    getStageDetail(stageId),
    listSubcontractors(),
    getStockBalances(id),
    listKnownMaterialItems(),
  ]);
  if (!stage || stage.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.name}
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">Add a task</h1>
      <p className="mb-6 text-muted-foreground">
        This will be task {stage.tasks.length + 1} in {stage.name}.
      </p>

      <TaskForm
        action={createTaskAction.bind(null, id, stageId)}
        subcontractors={subcontractors
          .filter((s) => s.status === "active")
          .map((s) => ({ id: s.id, name: s.name }))}
        seq={stage.tasks.length + 1}
        submitLabel="Add task"
        cancelHref={`/projects/${id}/stages/${stageId}`}
        stockBalances={stockBalances}
        knownItems={knownItems}
      />
    </main>
  );
}
