import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import {
  currentTakeOffFigures,
  type LabourPayment,
  type MaterialTakeOffLine,
  type PaymentMethod,
  type Task,
} from "@/lib/tasks";
import type { StageFinancials } from "@/lib/types";
import type { LabourPaymentInput } from "@/lib/validation/labour-payments";
import type { TakeOffLineInput, TaskInput } from "@/lib/validation/tasks";

import { getCurrentAccountId } from "./account-context";
import { drawFromStock, type StockLine } from "./material-stock";
import { computeStageFinancials } from "./projection";
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
 * Slice 2.4b, revised by Phase 3 ticket 03 (Budget Variance Analysis).
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert only ever writes
 * the caller's own row and a cross-account update is a silent no-op — callers
 * read the returned-rows count and 404.
 *
 * `tasks.subcontractor_id` stays a loose column (no composite FK) — the same
 * call 2.1 / 2.4a made for `projects.current_stage_id`: this DAL validates the
 * pointer targets a live subcontractor in the caller's Account before writing
 * it.
 *
 * Take-off lines: before a stage's Funding Request is issued/closed
 * (`stageBudgetLocked`), editing a Task's take-off is still delete-and-reinsert
 * — there is no client-facing Approved Estimate yet to protect. Once locked,
 * `*_original` is frozen and edits become true per-line `UPDATE`s writing only
 * `*_revised` (ticket 03 §2) — see `applyLockedTakeOffEdits`. Every take-off
 * query and write in this file excludes rows with a non-null `variation_id`:
 * those are appended by Variation approval (`approveVariation`, ticket 01 §3),
 * are never shown on the Task edit form, and must never be matched, revised,
 * or "dropped" by this per-line diff — only that Variation can touch them.
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
    const qtyOriginal = l.qtyOriginal != null ? Number(l.qtyOriginal) : null;
    const estUnitCostOriginal = l.estUnitCostOriginal ?? null;
    const { qty, estUnitCost } = currentTakeOffFigures({
      qtyOriginal,
      qtyRevised: l.qtyRevised != null ? Number(l.qtyRevised) : null,
      estUnitCostOriginal,
      estUnitCostRevised: l.estUnitCostRevised ?? null,
    });
    list.push({
      id: l.id,
      seq: list.length + 1,
      item: l.item,
      description: l.description,
      variationId: l.variationId,
      qty,
      unit: l.unit,
      estUnitCost,
      qtyOriginal,
      estUnitCostOriginal,
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

/**
 * One stage with its header fields, its tasks, and its freshly-projected
 * `StageFinancials` (Phase 3 ticket 03 §3/§4 — the Budget Variance card reads
 * `financials.materialEstimated`/`labourAgreementTotal` via `@/lib/finance`),
 * or `null` (missing / cross-account).
 */
export async function getStageDetail(stageId: string): Promise<
  | {
      id: string;
      projectId: string;
      projectName: string;
      name: string;
      seq: number;
      status: string;
      completedOn: string | null;
      tasks: Task[];
      financials: StageFinancials;
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
        completedOn: stages.completedOn,
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

    return {
      ...stage,
      tasks: await assemble(tx, rows),
      financials: await computeStageFinancials(tx, stageId),
    };
  });
}

/**
 * Whether a Stage's budget numbers (a Task's labour agreement, a Material
 * Line's estimate) are locked — Operational Control decision 3
 * (`.scratch/operational-control/map.md`): once a Stage's Funding Request is
 * issued (or closed), a real change goes through **superseding the Funding
 * Request** instead, so there is exactly one place a client-facing number
 * changes after the fact.
 *
 * Phase 3 ticket 05 (Stage Closeout) §2 adds a second OR condition: a Stage
 * can reach `completed` without ever having an Issued Funding Request (e.g. a
 * trivial stage) — that gap must not leave a "completed" stage's budget still
 * editable, so `stages.status = 'completed'` locks it too, no new column.
 */
const PAYMENT_METHOD_LABELS: Record<string, PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

async function stageBudgetLocked(tx: AccountTx, stageId: string): Promise<boolean> {
  const { rows } = await tx.execute<{ locked: boolean }>(sql`
    SELECT (
      EXISTS (
        SELECT 1 FROM funding_requests
         WHERE stage_id = ${stageId} AND status IN ('issued', 'closed')
      )
      OR EXISTS (
        SELECT 1 FROM stages WHERE id = ${stageId} AND status = 'completed'
      )
    ) AS locked
  `);
  return Boolean(rows[0]?.locked);
}

/**
 * A take-off line as the edit form works with it (Phase 3 ticket 03 §2): `id`
 * is present only for a line that already exists in the database — a missing
 * `id` on submission tells the per-line diff to insert a new row. `qty` /
 * `estUnitCost` carry the line's *current* figures (revised pair once set,
 * else original — see `currentTakeOffFigures`); `qtyOriginal` /
 * `estUnitCostOriginal` are exposed alongside so the form can show what the
 * Approved Estimate was before any revision.
 */
export type EditableTakeOffLine = TakeOffLineInput & {
  id?: string;
  qtyOriginal?: number | null;
  estUnitCostOriginal?: number | null;
};

/** The editable body of one Task, form-shaped, or `null` (missing / cross-account). */
export async function getTaskInput(taskId: string): Promise<
  | (Omit<TaskInput, "lines"> & {
      projectId: string;
      stageId: string;
      stageName: string;
      lines: EditableTakeOffLine[];
      /** A task with any labour payment cannot be deleted — the history is kept. */
      hasLabourPayments: boolean;
      /** Every Labour Payment against this task's agreement, oldest first. */
      payments: LabourPayment[];
      /** The labour agreement as first set — `null` if none has ever been recorded. */
      labourOriginalAmount: number | null;
      /** Whether the Stage's Funding Request is issued/closed — see `stageBudgetLocked`. */
      budgetLocked: boolean;
      /**
       * Σ current estimate of this Task's Variation-appended material lines
       * (`variation_id` not null) — shown separately from the editable
       * take-off total, since those rows never appear in `lines` (ticket 03's
       * cross-reference note: they reconcile against their Variation's
       * `material_impact`, not this per-line diff). 0 when there are none.
       */
      variationMaterialTotal: number;
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

    // Ordinary take-off lines only — a Variation-appended row (`variation_id`
    // not null) never appears on the Task edit form (ticket 03's
    // cross-reference note).
    const lineRows = await tx
      .select()
      .from(materialLines)
      .where(
        sql`${materialLines.taskId} = ${taskId} AND ${materialLines.variationId} IS NULL`,
      )
      .orderBy(asc(materialLines.createdAt));

    const variationLineRows = await tx
      .select()
      .from(materialLines)
      .where(
        sql`${materialLines.taskId} = ${taskId} AND ${materialLines.variationId} IS NOT NULL`,
      );

    const paymentRows = await tx
      .select()
      .from(labourPayments)
      .where(eq(labourPayments.taskId, taskId))
      .orderBy(asc(labourPayments.paidOn));

    const variationMaterialTotal = variationLineRows.reduce((sum, l) => {
      const { qty, estUnitCost } = currentTakeOffFigures({
        qtyOriginal: l.qtyOriginal != null ? Number(l.qtyOriginal) : null,
        qtyRevised: l.qtyRevised != null ? Number(l.qtyRevised) : null,
        estUnitCostOriginal: l.estUnitCostOriginal ?? null,
        estUnitCostRevised: l.estUnitCostRevised ?? null,
      });
      if (qty == null || estUnitCost == null) return sum;
      return sum + Math.round(qty * estUnitCost);
    }, 0);

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
      lines: lineRows.map((l) => {
        const qtyOriginal = l.qtyOriginal != null ? Number(l.qtyOriginal) : null;
        const estUnitCostOriginal = l.estUnitCostOriginal ?? null;
        const { qty, estUnitCost } = currentTakeOffFigures({
          qtyOriginal,
          qtyRevised: l.qtyRevised != null ? Number(l.qtyRevised) : null,
          estUnitCostOriginal,
          estUnitCostRevised: l.estUnitCostRevised ?? null,
        });
        return {
          id: l.id,
          item: l.item,
          description: l.description ?? undefined,
          qty: qty ?? undefined,
          unit: l.unit,
          estUnitCost: estUnitCost ?? undefined,
          qtyOriginal,
          estUnitCostOriginal,
        };
      }),
      hasLabourPayments: paymentRows.length > 0,
      payments: paymentRows.map((p) => ({
        id: p.id,
        paidOn: p.paidOn,
        amount: p.amount,
        method: PAYMENT_METHOD_LABELS[p.method] ?? "Other",
        reference: p.reference,
        notes: p.notes,
        voidedAt: p.voidedAt ? p.voidedAt.toISOString() : null,
        voidReason: p.voidReason,
      })),
      labourOriginalAmount: row.labourOriginal,
      budgetLocked: await stageBudgetLocked(tx, row.stageId),
      variationMaterialTotal,
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
 * The post-lock take-off write path (Phase 3 ticket 03 §2): a true per-line
 * diff against a Task's *ordinary* material lines (`variation_id IS NULL` —
 * a Variation-appended row is never read, matched, or touched here).
 *
 * - A submitted line whose `id` matches an existing row is a revision:
 *   `qty_original`/`est_unit_cost_original` are never overwritten, and the
 *   `*_revised` pair is only written when the current figure (revised, or
 *   original if never revised) actually differs from what was submitted —
 *   so re-saving an untouched line does not manufacture a spurious revision.
 * - A submitted line with no `id` (or an `id` that isn't one of this task's
 *   own existing rows) is new: inserted with `*_original` left `NULL` and
 *   only the `*_revised` pair set, mirroring a Task's `labourOriginal`
 *   staying unset until first written.
 * - An existing row whose `id` is absent from the submission was dropped in
 *   the form; rather than deleting it (there is no per-line identity to
 *   later re-attach a delivery/PO line to, and silently removing a
 *   client-facing estimate line is the risk Operational Control decision 3
 *   was written to prevent), it is recorded as `qty_revised = 0` — the line
 *   stays visible, its revised cost reads zero.
 */
async function applyLockedTakeOffEdits(
  tx: AccountTx,
  accountId: string,
  taskId: string,
  lines: TakeOffLineInput[],
): Promise<void> {
  const existing = await tx
    .select()
    .from(materialLines)
    .where(
      sql`${materialLines.taskId} = ${taskId} AND ${materialLines.variationId} IS NULL`,
    );
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const submittedIds = new Set<string>();

  for (const line of lines) {
    const row = line.id ? existingById.get(line.id) : undefined;
    if (row) {
      submittedIds.add(row.id);
      const current = currentTakeOffFigures({
        qtyOriginal: row.qtyOriginal != null ? Number(row.qtyOriginal) : null,
        qtyRevised: row.qtyRevised != null ? Number(row.qtyRevised) : null,
        estUnitCostOriginal: row.estUnitCostOriginal ?? null,
        estUnitCostRevised: row.estUnitCostRevised ?? null,
      });
      const nextQty = line.qty ?? null;
      const nextCost = line.estUnitCost ?? null;
      if (nextQty !== current.qty || nextCost !== current.estUnitCost) {
        await tx
          .update(materialLines)
          .set({
            qtyRevised: nextQty != null ? String(nextQty) : null,
            estUnitCostRevised: nextCost,
            updatedAt: new Date(),
          })
          .where(eq(materialLines.id, row.id));
      }
    } else {
      await tx.insert(materialLines).values({
        accountId,
        taskId,
        item: line.item,
        description: line.description ?? null,
        unit: line.unit,
        qtyOriginal: null,
        estUnitCostOriginal: null,
        qtyRevised: line.qty != null ? String(line.qty) : null,
        estUnitCostRevised: line.estUnitCost ?? null,
      });
    }
  }

  for (const row of existing) {
    if (!submittedIds.has(row.id)) {
      await tx
        .update(materialLines)
        .set({ qtyRevised: "0", updatedAt: new Date() })
        .where(eq(materialLines.id, row.id));
    }
  }
}

/**
 * The submitted lines that named a positive "Apply from stock" amount (Phase
 * 3 ticket 06 §4) — draw candidates for `drawFromStock`. The DAL re-caps each
 * at the live on-hand balance regardless of what the form already bounded.
 */
function stockDrawsFrom(lines: TakeOffLineInput[]): StockLine[] {
  return lines
    .filter((l) => l.applyFromStock != null && l.applyFromStock > 0)
    .map((l) => ({ item: l.item, unit: l.unit, qty: l.applyFromStock! }));
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
      .select({ id: stages.id, projectId: stages.projectId })
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
    // Phase 3 ticket 06 §4: "Apply from stock" decrements the ledger for the
    // consuming side — a manual, bounded amount per line, never automatic.
    await drawFromStock(tx, accountId, stage.projectId, row.id, stockDrawsFrom(input.lines));
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
      .select({
        id: tasks.id,
        stageId: tasks.stageId,
        labourOriginal: tasks.labourOriginal,
        projectId: stages.projectId,
      })
      .from(tasks)
      .innerJoin(stages, eq(stages.id, tasks.stageId))
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!task) return false;
    if (!(await subcontractorIsValid(tx, input.subcontractorId))) return false;

    // Operational Control decision 3: the labour agreement's *original* value
    // is set once and never overwritten; every edit after that is a
    // *revision*, and once the stage's Funding Request is issued/closed
    // neither can change at all — see `stageBudgetLocked`. The UI keeps the
    // amount field read-only in that case (so it always resubmits the
    // current value unchanged); this is the defensive backstop for a
    // request that bypasses the UI, same posture as `subcontractorIsValid`.
    const locked = await stageBudgetLocked(tx, task.stageId);
    const labourAmountFields = locked
      ? {}
      : task.labourOriginal == null
        ? { labourOriginal: input.labourAmount ?? null }
        : { labourRevised: input.labourAmount ?? null };

    const res = await tx
      .update(tasks)
      .set({
        subcontractorId: input.subcontractorId ?? null,
        description: input.description,
        ...labourAmountFields,
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

    // Take-off lines (ticket 03 §2): before lock there is no client-facing
    // Approved Estimate yet to protect, so an edit stays delete-and-reinsert —
    // but only over this Task's *ordinary* lines; a Variation-appended row
    // (`variation_id` not null) is never deleted by an unrelated Task edit.
    // Once locked, `*_original` is frozen and the write becomes a true
    // per-line diff (`applyLockedTakeOffEdits`) writing only `*_revised`.
    if (!locked) {
      await tx
        .delete(materialLines)
        .where(
          sql`${materialLines.taskId} = ${taskId} AND ${materialLines.variationId} IS NULL`,
        );
      await insertTakeOffLines(tx, accountId, taskId, input.lines);
    } else {
      await applyLockedTakeOffEdits(tx, accountId, taskId, input.lines);
    }

    // Phase 3 ticket 06 §4: "Apply from stock" decrements the ledger for the
    // consuming side — independent of the lock branch above.
    await drawFromStock(tx, accountId, task.projectId, taskId, stockDrawsFrom(input.lines));
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

// --- Labour payments -----------------------------------------------------

export type LabourPaymentResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "no-agreement" };

/**
 * Append a Labour Payment against a Task's labour agreement. Append-only with
 * reversal — a correction is a void plus a fresh record (mirrors the Purchase
 * Order Supplier Payment write path, `recordPayment` in
 * `@/lib/data/procurement`). Refused when the Task has no labour agreement
 * amount yet (nothing to pay against).
 */
export async function recordLabourPayment(
  taskId: string,
  input: LabourPaymentInput,
): Promise<LabourPaymentResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [task] = await tx
      .select({
        labourOriginal: tasks.labourOriginal,
        labourRevised: tasks.labourRevised,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!task) return { ok: false as const, reason: "not-found" as const };
    if (task.labourOriginal == null && task.labourRevised == null) {
      return { ok: false as const, reason: "no-agreement" as const };
    }

    await tx.insert(labourPayments).values({
      accountId,
      taskId,
      paidOn: input.paidOn,
      amount: input.amount,
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    });

    return { ok: true as const };
  });
}

/** Void a Labour Payment (append-only with reversal). `false` when missing. */
export async function voidLabourPayment(
  taskId: string,
  paymentId: string,
  reason: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(labourPayments)
      .set({ voidedAt: new Date(), voidReason: reason, updatedAt: new Date() })
      .where(
        and(
          eq(labourPayments.id, paymentId),
          eq(labourPayments.taskId, taskId),
          sql`${labourPayments.voidedAt} IS NULL`,
        ),
      )
      .returning({ id: labourPayments.id });
    return res.length > 0;
  });
}
