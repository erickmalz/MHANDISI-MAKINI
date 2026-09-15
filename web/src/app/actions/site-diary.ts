"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSiteDiaryEntry,
  deleteSiteDiaryEntry,
  updateSiteDiaryEntry,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { siteDiaryEntrySchema } from "@/lib/validation/site-diary";

/**
 * Site Diary Server Actions (Phase 4 Slice 4.1, ticket 01). Same idiom as
 * `actions/variations.ts`: ids arrive as bound arguments, never from the
 * form body; every entry point re-scopes through the DAL (`withAccount` +
 * RLS).
 */

function revalidateStage(projectId: string, stageId: string) {
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}

export async function createSiteDiaryEntryAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = siteDiaryEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const id = await createSiteDiaryEntry(stageId, parsed.data);
  if (!id) return { error: "This stage could not be found." };

  revalidateStage(projectId, stageId);
  redirect(`/projects/${projectId}/stages/${stageId}`);
}

export async function updateSiteDiaryEntryAction(
  projectId: string,
  stageId: string,
  entryId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = siteDiaryEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const ok = await updateSiteDiaryEntry(entryId, parsed.data);
  if (!ok) return { error: "This entry could not be found." };

  revalidateStage(projectId, stageId);
  redirect(`/projects/${projectId}/stages/${stageId}`);
}

export async function deleteSiteDiaryEntryAction(
  projectId: string,
  stageId: string,
  entryId: string,
): Promise<void> {
  await deleteSiteDiaryEntry(entryId);
  revalidateStage(projectId, stageId);
}
