"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveVariation,
  cancelVariation,
  createVariationDraft,
  deleteVariationDraft,
  rejectVariation,
  updateVariationDraft,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { approveVariationSchema, variationDraftSchema } from "@/lib/validation/variations";

/**
 * Variation Server Actions (Phase 3 Slice 3.1). Every entry point re-scopes
 * through the DAL (`withAccount` + RLS); the project / stage / variation ids
 * arrive as bound arguments, never from the form body. Ids in the URL are
 * opaque UUIDs (ticket 06).
 */

function revalidateVariation(projectId: string, stageId: string, variationId?: string) {
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  if (variationId) revalidatePath(`/projects/${projectId}/variations/${variationId}`);
}

function readDraft(formData: FormData) {
  return {
    taskId: formData.get("taskId") ?? undefined,
    description: formData.get("description") ?? undefined,
    reason: formData.get("reason") ?? undefined,
    materialImpact: formData.get("materialImpact") ?? undefined,
    labourImpact: formData.get("labourImpact") ?? undefined,
    feeImpact: formData.get("feeImpact") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };
}

export async function createVariationAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = variationDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let variationId: string | null;
  try {
    variationId = await createVariationDraft(stageId, parsed.data);
  } catch {
    return { error: "Could not save the draft. Try again." };
  }
  if (!variationId) {
    return { error: "That stage, or the chosen task, could not be found." };
  }

  revalidateVariation(projectId, stageId, variationId);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}

export async function updateVariationAction(
  projectId: string,
  stageId: string,
  variationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = variationDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateVariationDraft(variationId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) {
    return { error: "This draft, or the chosen task, could not be found — or it is already decided." };
  }

  revalidateVariation(projectId, stageId, variationId);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}

export async function deleteVariationDraftAction(
  projectId: string,
  stageId: string,
  variationId: string,
): Promise<void> {
  const ok = await deleteVariationDraft(variationId);
  revalidateVariation(projectId, stageId, variationId);
  if (ok) redirect(`/projects/${projectId}/stages/${stageId}`);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}

export async function approveVariationAction(
  projectId: string,
  stageId: string,
  variationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = approveVariationSchema.safeParse({
    approvedAt: formData.get("approvedAt") ?? undefined,
    clientReference: formData.get("clientReference") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let result: Awaited<ReturnType<typeof approveVariation>>;
  try {
    result = await approveVariation(variationId, parsed.data);
  } catch {
    return { error: "Could not approve the Variation. Try again." };
  }
  if (!result.ok) {
    return {
      error:
        result.reason === "not-found"
          ? "This Variation could not be found."
          : "Only a Draft Variation can be approved.",
    };
  }

  revalidateVariation(projectId, stageId, variationId);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}

export async function rejectVariationAction(
  projectId: string,
  stageId: string,
  variationId: string,
): Promise<void> {
  await rejectVariation(variationId);
  revalidateVariation(projectId, stageId, variationId);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}

export async function cancelVariationAction(
  projectId: string,
  stageId: string,
  variationId: string,
): Promise<void> {
  await cancelVariation(variationId);
  revalidateVariation(projectId, stageId, variationId);
  redirect(`/projects/${projectId}/variations/${variationId}`);
}
