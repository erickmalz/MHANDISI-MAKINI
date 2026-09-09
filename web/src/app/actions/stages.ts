"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createStage, setCurrentStage, updateStage } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { stageInputSchema } from "@/lib/validation/structure";

/**
 * Stage create / edit / set-current Server Actions (Slice 2.4a). All re-scope
 * through the DAL (`withAccount` + RLS); the project / stage ids arrive as
 * bound arguments, never from the form body.
 */

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? undefined,
    feeBasis: formData.get("feeBasis") ?? undefined,
    feeAmount: formData.get("feeAmount") ?? undefined,
    feePercent: formData.get("feePercent") ?? undefined,
    status: formData.get("status") ?? undefined,
    progressPercent: formData.get("progressPercent") ?? undefined,
    startedOn: formData.get("startedOn") ?? undefined,
    completedOn: formData.get("completedOn") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };
}

export async function createStageAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = stageInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let stageId: string | null;
  try {
    stageId = await createStage(projectId, parsed.data);
  } catch {
    return { error: "Could not add the stage. Try again." };
  }
  if (!stageId) return { error: "That project could not be found." };

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function updateStageAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = stageInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateStage(stageId, parsed.data);
  } catch {
    return { error: "Could not save the stage. Try again." };
  }
  if (!ok) return { error: "That stage could not be found." };

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function setCurrentStageAction(
  projectId: string,
  stageId: string,
): Promise<void> {
  const ok = await setCurrentStage(projectId, stageId);
  if (ok) revalidatePath(`/projects/${projectId}`);
}
