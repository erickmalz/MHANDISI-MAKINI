"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { closeStage, resolveSurplusMaterials } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { surplusLinesSchema } from "@/lib/validation/stage-closeout";

/**
 * Stage Closeout Server Actions (Phase 3 Slice 3.4, ticket 05). Every entry
 * point re-scopes through the DAL (`withAccount` + RLS); the project / stage
 * ids arrive as bound arguments, never from the form body.
 */

function revalidateCloseout(projectId: string, stageId: string) {
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}/closeout`);
}

/**
 * `Close Stage` — a plain action, not a `useActionState` form: the checklist
 * screen already disables the button unless its own re-derived gates are all
 * clear, so the only failures this can hit are a race (someone else changed
 * something) or a stale reload. On a failed re-check, redirects back to the
 * closeout screen with `?closeError=…` so the screen can explain why, rather
 * than silently doing nothing — the checklist itself always recomputes fresh
 * either way.
 */
export async function closeStageAction(
  projectId: string,
  stageId: string,
): Promise<void> {
  const result = await closeStage(stageId);
  revalidateCloseout(projectId, stageId);
  if (result.ok) {
    redirect(`/projects/${projectId}/stages/${stageId}/closeout`);
  }
  redirect(
    `/projects/${projectId}/stages/${stageId}/closeout?closeError=${result.reason}`,
  );
}

function readSurplusLines(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return [];
  }
}

/**
 * The post-closeout "Carry Forward Surplus" action (ticket 05 §3) — resolves
 * each Engineer-entered surplus line to Carried Forward or Written Off
 * (ticket 06 §3/§5), calling straight into `carryForwardSurplus`/
 * `writeOffStock`. Only succeeds once the stage is actually `completed`.
 */
export async function resolveSurplusMaterialsAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = surplusLinesSchema.safeParse(readSurplusLines(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.length === 0) {
    return { error: "Add at least one surplus material line first." };
  }

  let ok: boolean;
  try {
    ok = await resolveSurplusMaterials(stageId, parsed.data);
  } catch {
    return { error: "Could not record the surplus materials. Try again." };
  }
  if (!ok) {
    return { error: "This stage could not be found, or is not yet closed." };
  }

  revalidateCloseout(projectId, stageId);
  revalidatePath(`/projects/${projectId}/material-stock`);
  redirect(`/projects/${projectId}/stages/${stageId}/closeout`);
}
