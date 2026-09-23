import { notFound } from "next/navigation";

import {
  deleteTaskAction,
  recordLabourPaymentAction,
  updateTaskAction,
  voidLabourPaymentAction,
} from "@/app/actions/tasks";
import {
  getStockBalances,
  getTaskInput,
  listKnownMaterialItems,
  listSubcontractors,
} from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { TaskForm } from "../../../../_components/TaskForm";
import { LabourPaymentsCard } from "./_components/LabourPaymentsCard";
import { TASK_STATUS_KEYS } from "../../../../_components/status-keys";

export default async function EditTaskPage({
  params,
}: PageProps<"/projects/[id]/tasks/[taskId]/edit">) {
  const { id, taskId } = await params;
  const t = await getT();

  const [task, subcontractors] = await Promise.all([
    getTaskInput(taskId),
    listSubcontractors(),
  ]);
  if (!task || task.projectId !== id) notFound();

  const [stockBalances, knownItems] = await Promise.all([
    getStockBalances(id),
    listKnownMaterialItems(),
  ]);

  // Active subcontractors, plus the one currently assigned even if it is now
  // inactive — so the picker can always show the task's real assignment.
  const options = subcontractors
    .filter((s) => s.status === "active" || s.id === task.subcontractorId)
    .map((s) => ({ id: s.id, name: s.name }));

  const back = `/projects/${id}/stages/${task.stageId}`;

  const voidActions = Object.fromEntries(
    task.payments.map((p) => [
      p.id,
      voidLabourPaymentAction.bind(null, id, task.stageId, taskId, p.id),
    ]),
  );

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[
          { label: t("stages.crumbs.overview"), href: `/projects/${id}` },
          { label: task.stageName, href: back },
        ]}
        title={t("tasks.edit.title")}
      />

      <TaskForm
        action={updateTaskAction.bind(null, id, task.stageId, taskId)}
        subcontractors={options}
        initial={task}
        submitLabel={t("tasks.edit.submit")}
        cancelHref={back}
        labourOriginalAmount={task.labourOriginalAmount}
        budgetLocked={task.budgetLocked}
        variationMaterialTotal={task.variationMaterialTotal}
        stockBalances={stockBalances}
        knownItems={knownItems}
      />

      <div className="mt-8">
        <LabourPaymentsCard
          labourAmount={task.labourAmount}
          payments={task.payments}
          paymentAction={recordLabourPaymentAction.bind(
            null,
            id,
            task.stageId,
            taskId,
            `/projects/${id}/tasks/${taskId}/edit`,
          )}
          voidActions={voidActions}
        />
      </div>

      <div className="mt-8 border-t border-border pt-6">
        {task.hasLabourPayments ? (
          <p className="text-sm text-muted-foreground">
            {t("tasks.edit.cannotDelete", { cancelled: t(TASK_STATUS_KEYS.cancelled) })}
          </p>
        ) : (
          <form action={deleteTaskAction.bind(null, id, task.stageId, taskId)}>
            <button
              type="submit"
              className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
            >
              {t("tasks.edit.delete")}
            </button>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("tasks.edit.deleteNote")}
            </p>
          </form>
        )}
      </div>
    </PageFrame>
  );
}
