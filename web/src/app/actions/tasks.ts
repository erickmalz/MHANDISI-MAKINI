"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createTask,
  deleteTask,
  recordLabourPayment,
  updateTask,
  voidLabourPayment,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import {
  labourPaymentSchema,
  voidReasonSchema,
} from "@/lib/validation/labour-payments";
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
  revalidateTaskDrafts(projectId);
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
  revalidateTaskDrafts(projectId);
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
    revalidateTaskDrafts(projectId);
  }
  redirect(`/projects/${projectId}/stages/${stageId}`);
}

/** A Task save re-syncs its draft Funding Request and planned Purchase Order. */
function revalidateTaskDrafts(projectId: string) {
  revalidatePath(`/projects/${projectId}/funding`);
  revalidatePath(`/projects/${projectId}/procurement`);
}

function revalidateTask(projectId: string, stageId: string, taskId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}/edit`);
}

const LABOUR_PAYMENT_ERRORS: Record<string, string> = {
  "not-found": "This task could not be found.",
  "no-agreement":
    "This task has no labour agreement amount yet — set one before recording a payment.",
};

export async function recordLabourPaymentAction(
  projectId: string,
  stageId: string,
  taskId: string,
  /** Where to send the user after a successful record — the Task edit page from its own form, the Stage page from the quick record-payment button there. */
  returnTo: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = labourPaymentSchema.safeParse({
    paidOn: formData.get("paidOn") ?? undefined,
    amount: formData.get("amount") ?? undefined,
    method: formData.get("method") ?? undefined,
    reference: formData.get("reference") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let result: Awaited<ReturnType<typeof recordLabourPayment>>;
  try {
    result = await recordLabourPayment(taskId, parsed.data);
  } catch {
    return { error: "Could not record the payment. Try again." };
  }
  if (!result.ok) {
    return { error: LABOUR_PAYMENT_ERRORS[result.reason] ?? "Could not record the payment." };
  }

  revalidateTask(projectId, stageId, taskId);
  redirect(returnTo);
}

export async function voidLabourPaymentAction(
  projectId: string,
  stageId: string,
  taskId: string,
  paymentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidReasonSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await voidLabourPayment(taskId, paymentId, parsed.data.reason);
  } catch {
    return { error: "Could not void the payment. Try again." };
  }
  if (!ok) return { error: "That payment could not be found." };

  revalidateTask(projectId, stageId, taskId);
  redirect(`/projects/${projectId}/tasks/${taskId}/edit`);
}
