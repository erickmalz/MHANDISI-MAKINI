import "server-only";

import { and, eq, sql } from "drizzle-orm";

import type { ProjectInput, StageInput } from "@/lib/validation/structure";

import { getCurrentAccountId } from "./account-context";
import { projects, stages } from "./schema";
import { withAccount } from "./with-account";

/**
 * The write side of the structure DAL (multi-tenancy ticket 08 §3) — Projects
 * and Stages (Slice 2.4a). Tasks and Material Take-Off lines land in 2.4b.
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert can only ever write
 * the caller's own `account_id` and an update targeting another Account's row is
 * a silent no-op — the callers read the returned-rows count and 404.
 *
 * `projects.current_stage_id` and (2.4b) `tasks.subcontractor_id` stay loose
 * columns — no composite FK (Slice 2.4 kept the call 2.1/2.2 made: a partial
 * `ON DELETE SET NULL` would otherwise be needed to protect the NOT NULL
 * `account_id`). This module validates those pointers before writing them.
 */

// --- Projects ---------------------------------------------------------------

/** The editable columns of a project, form-shaped, or `null` (missing / cross-account). */
export async function getProjectInput(
  projectId: string,
): Promise<(ProjectInput & { projectCode: string }) | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        projectCode: projects.projectCode,
        name: projects.name,
        clientName: projects.clientName,
        clientPhone: projects.clientPhone,
        clientEmail: projects.clientEmail,
        site: projects.site,
        estimateModel: projects.estimateModel,
        status: projects.status,
        startedOn: projects.startedOn,
        expectedCompletionOn: projects.expectedCompletionOn,
        notes: projects.notes,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) return null;
    return {
      projectCode: row.projectCode,
      name: row.name,
      clientName: row.clientName,
      clientPhone: row.clientPhone ?? undefined,
      clientEmail: row.clientEmail ?? undefined,
      site: row.site,
      estimateModel: row.estimateModel,
      status: row.status,
      startedOn: row.startedOn ?? undefined,
      expectedCompletionOn: row.expectedCompletionOn ?? undefined,
      notes: row.notes ?? undefined,
    };
  });
}

/**
 * Create a project and return its opaque id. The human-facing `project_code`
 * (`PRJ-{year}-{NNN}`, guidelines §46) is minted per-Account inside the same
 * transaction; the `UNIQUE (account_id, project_code)` constraint is the
 * backstop against the (single-user-account) race.
 */
export async function createProject(input: ProjectInput): Promise<string> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const prefix = `PRJ-${new Date().getFullYear()}-`;
    const { count } = (
      await tx.execute<{ count: number }>(sql`
        SELECT COUNT(*)::int AS count FROM projects
        WHERE project_code LIKE ${prefix + "%"}
      `)
    ).rows[0];
    const projectCode = `${prefix}${String(count + 1).padStart(3, "0")}`;

    const [row] = await tx
      .insert(projects)
      .values({
        accountId,
        projectCode,
        name: input.name,
        clientName: input.clientName,
        clientPhone: input.clientPhone ?? null,
        clientEmail: input.clientEmail ?? null,
        site: input.site,
        estimateModel: input.estimateModel,
        status: input.status,
        startedOn: input.startedOn ?? null,
        expectedCompletionOn: input.expectedCompletionOn ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: projects.id });
    return row.id;
  });
}

/** Update a project's editable fields. `false` when the id is missing / cross-account. */
export async function updateProject(
  projectId: string,
  input: ProjectInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(projects)
      .set({
        name: input.name,
        clientName: input.clientName,
        clientPhone: input.clientPhone ?? null,
        clientEmail: input.clientEmail ?? null,
        site: input.site,
        estimateModel: input.estimateModel,
        status: input.status,
        startedOn: input.startedOn ?? null,
        expectedCompletionOn: input.expectedCompletionOn ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning({ id: projects.id });
    return res.length > 0;
  });
}

// --- Stages ----------------------------------------------------------------

export async function getStageInput(
  stageId: string,
): Promise<(StageInput & { projectId: string; seq: number }) | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        projectId: stages.projectId,
        seq: stages.seq,
        name: stages.name,
        feeBasis: stages.feeBasis,
        feeAmount: stages.feeAmount,
        feePercent: stages.feePercent,
        status: stages.status,
        progressPercent: stages.progressPercent,
        startedOn: stages.startedOn,
        completedOn: stages.completedOn,
        notes: stages.notes,
      })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!row) return null;
    return {
      projectId: row.projectId,
      seq: row.seq,
      name: row.name,
      feeBasis: row.feeBasis ?? undefined,
      feeAmount: row.feeAmount ?? undefined,
      feePercent: row.feePercent != null ? Number(row.feePercent) : undefined,
      status: row.status,
      progressPercent: row.progressPercent,
      startedOn: row.startedOn ?? undefined,
      completedOn: row.completedOn ?? undefined,
      notes: row.notes ?? undefined,
    };
  });
}

/**
 * Create a stage under a project. `seq` is assigned `MAX(seq)+1` for the
 * project. The first stage a project gets also becomes its current stage
 * (a one-stage project has an unambiguous current stage); after that the
 * engineer sets it explicitly. Returns the stage id, or `null` when the
 * project is missing / cross-account.
 */
export async function createStage(
  projectId: string,
  input: StageInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id, currentStageId: projects.currentStageId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) return null;

    const { nextSeq } = (
      await tx.execute<{ nextSeq: number }>(sql`
        SELECT COALESCE(MAX(seq), 0) + 1 AS "nextSeq" FROM stages
        WHERE project_id = ${projectId}
      `)
    ).rows[0];

    const [row] = await tx
      .insert(stages)
      .values({
        accountId,
        projectId,
        name: input.name,
        seq: nextSeq,
        feeBasis: input.feeBasis ?? null,
        feeAmount: input.feeAmount ?? null,
        feePercent:
          input.feePercent != null ? String(input.feePercent) : null,
        status: input.status,
        progressPercent: input.progressPercent,
        startedOn: input.startedOn ?? null,
        completedOn: input.completedOn ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: stages.id });

    if (!project.currentStageId) {
      await tx
        .update(projects)
        .set({ currentStageId: row.id, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    return row.id;
  });
}

/** Update a stage's editable fields (not `seq`). `false` when missing / cross-account. */
export async function updateStage(
  stageId: string,
  input: StageInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(stages)
      .set({
        name: input.name,
        feeBasis: input.feeBasis ?? null,
        feeAmount: input.feeAmount ?? null,
        feePercent:
          input.feePercent != null ? String(input.feePercent) : null,
        status: input.status,
        progressPercent: input.progressPercent,
        startedOn: input.startedOn ?? null,
        completedOn: input.completedOn ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId))
      .returning({ id: stages.id });
    return res.length > 0;
  });
}

/**
 * Point a project's `current_stage_id` at one of its own stages (the engineer
 * works one stage at a time). Validates the stage belongs to the project —
 * the column is loose, so this check is the integrity guard.
 */
export async function setCurrentStage(
  projectId: string,
  stageId: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(and(eq(stages.id, stageId), eq(stages.projectId, projectId)))
      .limit(1);
    if (!stage) return false;

    const res = await tx
      .update(projects)
      .set({ currentStageId: stageId, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning({ id: projects.id });
    return res.length > 0;
  });
}
