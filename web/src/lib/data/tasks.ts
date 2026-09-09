import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";

import type { MaterialTakeOffLine, Task } from "@/lib/tasks";
import type { TakeOffLineInput, TaskInput } from "@/lib/validation/tasks";

import { getCurrentAccountId } from "./account-context";
import {
  labourPayments,
  materialLines,
  projects,
  stages,
  subcontractors,
  tasks,
} from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Task + Material Take-Off write/read DAL (multi-tenancy ticket 08 §3) —
 * Slice 2.4b.
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert only ever writes
 * the caller's own row and a cross-account update is a silent no-op — callers
 * read the returned-rows count and 404.
 *
 * `tasks.subcontractor_id` stays a loose column (no composite FK) — the same
 * call 2.1 / 2.4a made for `projects.current_stage_id`: this DAL validates the
 * pointer targets a live subcontractor in the caller's Account before writing
 * it. Take-off lines under a Task are delete-and-reinsert on edit (there is
 * nothing downstream of an estimate line yet).
 */

// --- View-model assembly -------------------------------------------------

const taskSelection = {
  id: tasks.id,
  stageId: tasks.stageId,
  stageName: stages.name,
  projectId: stages.projectId,
  description: tasks.description,
  seq: tasks.seq,
  subcontractorId: tasks.subcontractorId,
  subcontractorName: subcontractors.name,
  labourOriginal: tasks.labourOriginal,
  labourRevised: tasks.labourRevised,
  retentionPercent: tasks.retentionPercent,
  progressPercent: tasks.progressPercent,
  status: tasks.status,
  startedOn: tasks.startedOn,
  completedOn: tasks.completedOn,
  notes: tasks.notes,
} as const;

type TaskRow = {
  id: string;
  stageId: string;
  stageName: string;
  projectId: string;
  description: string;
  seq: number;
  subcontractorId: string | null;
  subcontractorName: string | null;
  labourOriginal: number | null;
  labourRevised: number | null;
  retentionPercent: string;
  progressPercent: number;
  status: Task["status"];
  startedOn: string | null;
  completedOn: string | null;
  notes: string | null;
};

async function assemble(tx: AccountTx, taskRows: TaskRow[]): Promise<Task[]> {
  if (taskRows.length === 0) return [];
  const taskIds = taskRows.map((r) => r.id);

  const lineRows = await tx
    .select()
    .from(materialLines)
    .where(inArray(materialLines.taskId, taskIds))
    .orderBy(asc(materialLines.createdAt));

  const linesByTask = new Map<string, MaterialTakeOffLine[]>();
  for (const l of lineRows) {
    const list = linesByTask.get(l.taskId) ?? [];
    list.push({
      id: l.id,
      seq: list.length + 1,
      item: l.item,
      description: l.description,
      qty: l.qtyOriginal != null ? Number(l.qtyOriginal) : null,
      unit: l.unit,
      estUnitCost: l.estUnitCostOriginal,
    });
    linesByTask.set(l.taskId, list);
  }

  return taskRows.map((r) => ({
    id: r.id,
    stageId: r.stageId,
    stageName: r.stageName,
    projectId: r.projectId,
    description: r.description,
    seq: r.seq,
    subcontractorId: r.subcontractorId,
    subcontractorName: r.subcontractorId ? r.subcontractorName : null,
    labourAmount: r.labourRevised ?? r.labourOriginal,
    retentionPercent: Number(r.retentionPercent),
    progressPercent: r.progressPercent,
    status: r.status,
    startedOn: r.startedOn,
    completedOn: r.completedOn,
    notes: r.notes,
    materialLines: linesByTask.get(r.id) ?? [],
  }));
}

/** Every Task under a stage, in sequence — the stage's task list. */
export async function listTasksForStage(stageId: string): Promise<Task[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(taskSelection)
      .from(tasks)
      .innerJoin(stages, eq(stages.id, tasks.stageId))
      .leftJoin(subcontractors, eq(subcontractors.id, tasks.subcontractorId))
      .where(eq(tasks.stageId, stageId))
      .orderBy(asc(tasks.seq))) as TaskRow[];
    return assemble(tx, rows);
  });
}

/** One stage with its header fields and its tasks, or `null` (missing / cross-account). */
export async function getStageDetail(stageId: string): Promise<
  | {
      id: string;
      projectId: string;
      projectName: string;
      name: string;
      seq: number;
      status: string;
      tasks: Task[];
    }
  | null
> {
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({
        id: stages.id,
        projectId: stages.projectId,
        projectName: projects.name,
        name: stages.name,
        seq: stages.seq,
        status: stages.status,
      })
      .from(stages)
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;

    const rows = (await tx
      .select(taskSelection)
      .from(tasks)
      .innerJoin(stages, eq(stages.id, tasks.stageId))
      .leftJoin(subcontractors, eq(subcontractors.id, tasks.subcontractorId))
      .where(eq(tasks.stageId, stageId))
      .orderBy(asc(tasks.seq))) as TaskRow[];

    return { ...stage, tasks: await assemble(tx, rows) };
  });
}

/** The editable body of one Task, form-shaped, or `null` (missing / cross-account). */
export async function getTaskInput(taskId: string): Promise<
  | (TaskInput & {
      projectId: string;
      stageId: string;
      stageName: string;
      /** A task with any labour payment cannot be deleted — the history is kept. */
      hasLabourPayments: boolean;
    })
  | null
> {
  return withAccount(async (tx) => {
    const [row] = (await tx
      .select({
        id: tasks.id,
        projectId: stages.projectId,
        stageId: tasks.stageId,
        stageName: stages.name,
        description: tasks.description,
        subcontractorId: tasks.subcontractorId,
        labourOriginal: tasks.labourOriginal,
        labourRevised: tasks.labourRevised,
        progressPercent: tasks.progressPercent,
        status: tasks.status,
        startedOn: tasks.startedOn,
        completedOn: tasks.completedOn,
        notes: tasks.notes,
      })
      .from(tasks)
      .innerJoin(stages, eq(stages.id, tasks.stageId))
      .where(eq(tasks.id, taskId))
      .limit(1)) as {
      id: string;
      projectId: string;
      stageId: string;
      stageName: string;
      description: string;
      subcontractorId: string | null;
      labourOriginal: number | null;
      labourRevised: number | null;
      progressPercent: number;
      status: Task["status"];
      startedOn: string | null;
      completedOn: string | null;
      notes: string | null;
    }[];
    if (!row) return null;

    const lineRows = await tx
      .select()
      .from(materialLines)
      .where(eq(materialLines.taskId, taskId))
      .orderBy(asc(materialLines.createdAt));

    const [payment] = await tx
      .select({ id: labourPayments.id })
      .from(labourPayments)
      .where(eq(labourPayments.taskId, taskId))
      .limit(1);

    return {
      projectId: row.projectId,
      stageId: row.stageId,
      stageName: row.stageName,
      description: row.description,
      subcontractorId: row.subcontractorId ?? undefined,
      labourAmount: row.labourRevised ?? row.labourOriginal ?? undefined,
      status: row.status,
      progressPercent: row.progressPercent,
      startedOn: row.startedOn ?? undefined,
      completedOn: row.completedOn ?? undefined,
      notes: row.notes ?? undefined,
      lines: lineRows.map((l) => ({
        item: l.item,
        description: l.description ?? undefined,
        qty: l.qtyOriginal != null ? Number(l.qtyOriginal) : undefined,
        unit: l.unit,
        estUnitCost: l.estUnitCostOriginal ?? undefined,
      })),
      hasLabourPayments: Boolean(payment),
    };
  });
}

// --- Writes ------------------------------------------------------------

async function insertTakeOffLines(
  tx: AccountTx,
  accountId: string,
  taskId: string,
  lines: TakeOffLineInput[],
): Promise<void> {
  if (lines.length === 0) return;
  await tx.insert(materialLines).values(
    lines.map((line) => ({
      accountId,
      taskId,
      item: line.item,
      description: line.description ?? null,
      qtyOriginal: line.qty != null ? String(line.qty) : null,
      unit: line.unit,
      estUnitCostOriginal: line.estUnitCost ?? null,
    })),
  );
}

/**
 * Assert `subcontractorId` (when given) points at a live subcontractor in the
 * caller's Account — the loose column's integrity guard. Returns `false` when
 * it does not.
 */
async function subcontractorIsValid(
  tx: AccountTx,
  subcontractorId: string | undefined,
): Promise<boolean> {
  if (!subcontractorId) return true;
  const [row] = await tx
    .select({ id: subcontractors.id })
    .from(subcontractors)
    .where(eq(subcontractors.id, subcontractorId))
    .limit(1);
  return Boolean(row);
}

/**
 * Create a Task under a stage. `seq` is assigned `MAX(seq)+1` for the stage.
 * Returns the new task id, or `null` when the stage is missing / cross-account
 * or the chosen subcontractor is not in the Account.
 */
export async function createTask(
  stageId: string,
  input: TaskInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;
    if (!(await subcontractorIsValid(tx, input.subcontractorId))) return null;

    const { nextSeq } = (
      await tx.execute<{ nextSeq: number }>(sql`
        SELECT COALESCE(MAX(seq), 0) + 1 AS "nextSeq" FROM tasks
        WHERE stage_id = ${stageId}
      `)
    ).rows[0];

    const [row] = await tx
      .insert(tasks)
      .values({
        accountId,
        stageId,
        subcontractorId: input.subcontractorId ?? null,
        description: input.description,
        seq: nextSeq,
        labourOriginal: input.labourAmount ?? null,
        progressPercent: input.progressPercent,
        status: input.status,
        startedOn: input.startedOn ?? null,
        completedOn: input.completedOn ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: tasks.id });

    await insertTakeOffLines(tx, accountId, row.id, input.lines);
    return row.id;
  });
}

/**
 * Update a Task's editable fields and replace its take-off lines. `false` when
 * the id is missing / cross-account or the chosen subcontractor is not in the
 * Account.
 */
export async function updateTask(
  taskId: string,
  input: TaskInput,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [task] = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!task) return false;
    if (!(await subcontractorIsValid(tx, input.subcontractorId))) return false;

    const res = await tx
      .update(tasks)
      .set({
        subcontractorId: input.subcontractorId ?? null,
        description: input.description,
        labourOriginal: input.labourAmount ?? null,
        progressPercent: input.progressPercent,
        status: input.status,
        startedOn: input.startedOn ?? null,
        completedOn: input.completedOn ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning({ id: tasks.id });
    if (res.length === 0) return false;

    await tx.delete(materialLines).where(eq(materialLines.taskId, taskId));
    await insertTakeOffLines(tx, accountId, taskId, input.lines);
    return true;
  });
}

/**
 * Discard a Task (cascades its take-off lines). Refused — returns `false` — when
 * the Task carries any Labour Payment: that payment history must be kept, and a
 * task-delete cascade would take it with it. `false` also when missing /
 * cross-account.
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const [payment] = await tx
      .select({ id: labourPayments.id })
      .from(labourPayments)
      .where(eq(labourPayments.taskId, taskId))
      .limit(1);
    if (payment) return false;

    const res = await tx
      .delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning({ id: tasks.id });
    return res.length > 0;
  });
}
