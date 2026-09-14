"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { createProject, updateProject } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { templateStageSchema } from "@/lib/validation/stage-templates";
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

/**
 * Parse the hidden `templateSelection` JSON payload `ProjectForm` posts when
 * the Engineer picked a Stage Template (Operational Control decision 2) — the
 * template's tree, already trimmed to what they left checked. Malformed or
 * absent input silently falls back to no template rather than blocking
 * project creation over a field with nowhere to show an error.
 */
function readTemplateSelection(formData: FormData) {
  try {
    const raw: unknown = JSON.parse(String(formData.get("templateSelection") ?? "[]"));
    const parsed = z.array(templateStageSchema).safeParse(raw);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectInputSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let projectId: string;
  try {
    projectId = await createProject(parsed.data, readTemplateSelection(formData));
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
