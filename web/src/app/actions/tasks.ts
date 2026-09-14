"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTask, deleteTask, updateTask } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { taskInputSchema } from "@/lib/validation/tasks";

/**
 * Task create / edit / delete Server Actions (Slice 2.4b). Each re-scopes
 * through the DAL (`withAccount` + RLS); the project / stage / task ids arrive
 * as bound arguments, never from the form body. Ids in the URL are opaque
 * UUIDs (ticket 06).
 */

function readForm(formData: FormData) {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = null;
  }
  return {
    description: formData.get("description") ?? undefined,
    subcontractorId: formData.get("subcontractorId") ?? undefined,
    labourAmount: formData.get("labourAmount") ?? undefined,
    status: formData.get("status") ?? undefined,
    progressPercent: formData.get("progressPercent") ?? undefined,
    startedOn: formData.get("startedOn") ?? undefined,
    completedOn: formData.get("completedOn") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    lines,
  };
}

export async function createTaskAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let taskId: string | null;
  try {
    taskId = await createTask(stageId, parsed.data);
  } catch {
    return { error: "Could not add the task. Try again." };
  }
  if (!taskId) {
    return { error: "That stage, or the chosen subcontractor, could not be found." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  redirect(`/projects/${projectId}/stages/${stageId}`);
}

export async function updateTaskAction(
  projectId: string,
  stageId: string,
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateTask(taskId, parsed.data);
  } catch {
    return { error: "Could not save the task. Try again." };
  }
  if (!ok) {
    return { error: "That task, or the chosen subcontractor, could not be found." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  redirect(`/projects/${projectId}/stages/${stageId}`);
}

export async function deleteTaskAction(
  projectId: string,
  stageId: string,
  taskId: string,
): Promise<void> {
  const ok = await deleteTask(taskId);
  if (ok) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  }
  redirect(`/projects/${projectId}/stages/${stageId}`);
}
