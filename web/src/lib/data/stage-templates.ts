import "server-only";

import { asc, eq } from "drizzle-orm";

import type { StageTemplateStage, StageTemplateSummary } from "@/lib/stage-templates";
import type { StageTemplateInput } from "@/lib/validation/stage-templates";

import { getCurrentAccountId } from "./account-context";
import type { StageTemplateBody } from "./schema";
import { materialLines, projects, stageTemplates, stages, tasks } from "./schema";
import { withAccount } from "./with-account";

/**
 * The Stage Template register DAL (Operational Control decision 2, Slice 6).
 * A per-Account register, starting empty like Suppliers/Subcontractors — but
 * unlike them, a template has no history depending on it (applying one only
 * ever copies names into a new project, with no live reference back), so
 * unlike the registers' "retire, never delete" rule, a template can be
 * deleted outright.
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert only ever writes
 * the caller's own row and a cross-account update/delete is a silent no-op —
 * callers read the returned-rows count and 404.
 */

function countTasks(body: StageTemplateBody): number {
  return body.stages.reduce((n, s) => n + s.tasks.length, 0);
}

/** Every Stage Template in the Account, by name — the register list. */
export async function listStageTemplates(): Promise<StageTemplateSummary[]> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select({ id: stageTemplates.id, name: stageTemplates.name, body: stageTemplates.body })
      .from(stageTemplates)
      .orderBy(asc(stageTemplates.name));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      stageCount: r.body.stages.length,
      taskCount: countTasks(r.body),
    }));
  });
}

/**
 * Every Stage Template with its full tree — for the "Create Project" page,
 * which needs each template's stages/tasks/material lines up front so the
 * Engineer can deselect items before the project exists. The Account's
 * template count is small enough that fetching every body at once is simpler
 * than a per-selection round trip.
 */
export async function listStageTemplatesForApply(): Promise<
  { id: string; name: string; stages: StageTemplateStage[] }[]
> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select({ id: stageTemplates.id, name: stageTemplates.name, body: stageTemplates.body })
      .from(stageTemplates)
      .orderBy(asc(stageTemplates.name));
    return rows.map((r) => ({ id: r.id, name: r.name, stages: r.body.stages }));
  });
}

/** The editable body of one Stage Template, form-shaped, or `null` (missing / cross-account). */
export async function getStageTemplateInput(
  templateId: string,
): Promise<StageTemplateInput | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ name: stageTemplates.name, body: stageTemplates.body })
      .from(stageTemplates)
      .where(eq(stageTemplates.id, templateId))
      .limit(1);
    if (!row) return null;
    return { name: row.name, stages: row.body.stages };
  });
}

/** Create a Stage Template and return its opaque id. */
export async function createStageTemplate(input: StageTemplateInput): Promise<string> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [row] = await tx
      .insert(stageTemplates)
      .values({ accountId, name: input.name, body: { stages: input.stages } })
      .returning({ id: stageTemplates.id });
    return row.id;
  });
}

/** Update a Stage Template's name and tree. `false` when missing / cross-account. */
export async function updateStageTemplate(
  templateId: string,
  input: StageTemplateInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(stageTemplates)
      .set({ name: input.name, body: { stages: input.stages }, updatedAt: new Date() })
      .where(eq(stageTemplates.id, templateId))
      .returning({ id: stageTemplates.id });
    return res.length > 0;
  });
}

/**
 * Delete a Stage Template. Unlike the Supplier/Subcontractor registers, this
 * is a real delete — a template leaves no trace in any project once applied
 * (decision 2: "there is no live reference back"), so there is no history to
 * protect. `false` when missing / cross-account.
 */
export async function deleteStageTemplate(templateId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(stageTemplates)
      .where(eq(stageTemplates.id, templateId))
      .returning({ id: stageTemplates.id });
    return res.length > 0;
  });
}

/**
 * "Save as template" (decision 2) — copies a project's stages' / tasks' /
 * material lines' *names and units only* into a new template, dropping every
 * number, then reuses the same write path a blank template uses. Returns the
 * new template id, or `null` when the project is missing / cross-account.
 */
export async function createTemplateFromProject(
  projectId: string,
  name: string,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return null;

    const stageRows = await tx
      .select({ id: stages.id, name: stages.name })
      .from(stages)
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(stages.seq));

    const body: StageTemplateBody = { stages: [] };
    for (const stage of stageRows) {
      const taskRows = await tx
        .select({ id: tasks.id, description: tasks.description })
        .from(tasks)
        .where(eq(tasks.stageId, stage.id))
        .orderBy(asc(tasks.seq));

      const stageOut: StageTemplateStage = { name: stage.name, tasks: [] };
      for (const task of taskRows) {
        const lineRows = await tx
          .select({ item: materialLines.item, unit: materialLines.unit })
          .from(materialLines)
          .where(eq(materialLines.taskId, task.id))
          .orderBy(asc(materialLines.createdAt));
        stageOut.tasks.push({
          description: task.description,
          materialLines: lineRows.map((l) => ({ item: l.item, unit: l.unit })),
        });
      }
      body.stages.push(stageOut);
    }

    const [row] = await tx
      .insert(stageTemplates)
      .values({ accountId, name, body })
      .returning({ id: stageTemplates.id });
    return row.id;
  });
}
