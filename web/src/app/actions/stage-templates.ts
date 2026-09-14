"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createStageTemplate,
  createTemplateFromProject,
  deleteStageTemplate,
  updateStageTemplate,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import {
  saveAsTemplateInputSchema,
  stageTemplateInputSchema,
} from "@/lib/validation/stage-templates";

/**
 * Stage Template register Server Actions (Operational Control decision 2,
 * Slice 6). Each re-scopes through the DAL (`withAccount` + RLS); the
 * template id arrives as a bound argument, never from the form body. Ids in
 * the URL are opaque UUIDs (ticket 06).
 */

/** Parse the hidden `stages` JSON payload the builder posts (same pattern as `funding.ts`'s `lines`). */
function readTemplate(formData: FormData) {
  let stages: unknown = [];
  try {
    stages = JSON.parse(String(formData.get("stages") ?? "[]"));
  } catch {
    stages = null;
  }
  return { name: formData.get("name") ?? undefined, stages };
}

export async function createStageTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = stageTemplateInputSchema.safeParse(readTemplate(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    await createStageTemplate(parsed.data);
  } catch {
    return { error: "Could not save the template. Try again." };
  }

  revalidatePath("/stage-templates");
  redirect("/stage-templates");
}

export async function updateStageTemplateAction(
  templateId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = stageTemplateInputSchema.safeParse(readTemplate(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateStageTemplate(templateId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) return { error: "That template could not be found." };

  revalidatePath("/stage-templates");
  redirect("/stage-templates");
}

export async function deleteStageTemplateAction(templateId: string): Promise<void> {
  await deleteStageTemplate(templateId);
  revalidatePath("/stage-templates");
  redirect("/stage-templates");
}

export async function createTemplateFromProjectAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = saveAsTemplateInputSchema.safeParse({
    name: formData.get("name") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let templateId: string | null;
  try {
    templateId = await createTemplateFromProject(projectId, parsed.data.name);
  } catch {
    return { error: "Could not save this project as a template. Try again." };
  }
  if (!templateId) return { error: "That project could not be found." };

  revalidatePath("/stage-templates");
  redirect("/stage-templates");
}
