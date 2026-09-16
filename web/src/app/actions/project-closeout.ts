"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { archiveProject, completeProject } from "@/lib/data";

/**
 * Project Closeout Server Actions (Phase 4 Slice 4.3, ticket 04). Mirrors
 * `src/app/actions/stage-closeout.ts`: every entry point re-scopes through
 * the DAL (`withAccount` + RLS); the project id arrives as a bound argument,
 * never from the form body.
 */

function revalidateCloseout(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/closeout`);
  revalidatePath("/");
}

/**
 * `Complete Project` — a plain action, not a `useActionState` form: the
 * checklist screen already disables the button unless its own re-derived
 * gate is clear, so the only realistic failures are a race or a stale
 * reload. On a failed re-check, redirects back to the closeout screen with
 * `?completeError=…` so the screen can show why, matching
 * `closeStageAction`'s posture one level down.
 */
export async function completeProjectAction(projectId: string): Promise<void> {
  const result = await completeProject(projectId);
  revalidateCloseout(projectId);
  if (result.ok) {
    redirect(`/projects/${projectId}/closeout`);
  }
  redirect(`/projects/${projectId}/closeout?completeError=${result.reason}`);
}

/**
 * `Archive Project` — same plain-action posture. Only ever available once
 * `status = 'completed'`, re-checked server-side.
 */
export async function archiveProjectAction(projectId: string): Promise<void> {
  const result = await archiveProject(projectId);
  revalidateCloseout(projectId);
  if (result.ok) {
    redirect(`/projects/${projectId}/closeout`);
  }
  redirect(`/projects/${projectId}/closeout?archiveError=${result.reason}`);
}
