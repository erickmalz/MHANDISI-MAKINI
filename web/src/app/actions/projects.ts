"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProject, updateProject } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { projectInputSchema } from "@/lib/validation/structure";

/**
 * Project create / edit Server Actions (Slice 2.4a). Each is an independent
 * entry point that re-validates through the DAL (`withAccount` + RLS) — a
 * direct POST cannot reach another Account's project.
 */

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? undefined,
    clientName: formData.get("clientName") ?? undefined,
    clientPhone: formData.get("clientPhone") ?? undefined,
    clientEmail: formData.get("clientEmail") ?? undefined,
    site: formData.get("site") ?? undefined,
    estimateModel: formData.get("estimateModel") ?? undefined,
    status: formData.get("status") ?? undefined,
    startedOn: formData.get("startedOn") ?? undefined,
    expectedCompletionOn: formData.get("expectedCompletionOn") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  };
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let projectId: string;
  try {
    projectId = await createProject(parsed.data);
  } catch {
    return { error: "Could not create the project. Try again." };
  }

  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateProject(projectId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) return { error: "That project could not be found." };

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
