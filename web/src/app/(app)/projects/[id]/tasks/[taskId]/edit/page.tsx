import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { deleteTaskAction, updateTaskAction } from "@/app/actions/tasks";
import { getTaskInput, listSubcontractors } from "@/lib/data";
import { TaskForm } from "../../../../_components/TaskForm";

export default async function EditTaskPage({
  params,
}: PageProps<"/projects/[id]/tasks/[taskId]/edit">) {
  const { id, taskId } = await params;

  const [task, subcontractors] = await Promise.all([
    getTaskInput(taskId),
    listSubcontractors(),
  ]);
  if (!task || task.projectId !== id) notFound();

  // Active subcontractors, plus the one currently assigned even if it is now
  // inactive — so the picker can always show the task's real assignment.
  const options = subcontractors
    .filter((s) => s.status === "active" || s.id === task.subcontractorId)
    .map((s) => ({ id: s.id, name: s.name }));

  const back = `/projects/${id}/stages/${task.stageId}`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={back}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {task.stageName}
      </Link>

      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">Edit task</h1>

      <TaskForm
        action={updateTaskAction.bind(null, id, task.stageId, taskId)}
        subcontractors={options}
        initial={task}
        submitLabel="Save changes"
        cancelHref={back}
      />

      <div className="mt-8 border-t border-border pt-6">
        {task.hasLabourPayments ? (
          <p className="text-sm text-muted-foreground">
            This task has recorded labour payments, so it can&apos;t be deleted —
            set its status to <span className="font-bold">Cancelled</span> instead.
          </p>
        ) : (
          <form action={deleteTaskAction.bind(null, id, task.stageId, taskId)}>
            <button
              type="submit"
              className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline"
            >
              Delete this task
            </button>
            <p className="mt-1 text-sm text-muted-foreground">
              Removes the task and its material take-off. Its labour agreement
              stops counting against the stage.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
