import "server-only";

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { buildTaskDraftLines, stockKey } from "@/lib/task-drafts";

import { insertLines } from "./funding";
import { insertPoLines } from "./procurement";
import {
  fundingRequestLines,
  fundingRequests,
  materialLines,
  materialStockMovements,
  purchaseOrderLines,
  purchaseOrders,
  stages,
  subcontractors,
  tasks,
} from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * Task-sourced drafts: every Task save keeps one draft Funding Request and one
 * planned Purchase Order in step with the Task's requirements (its labour
 * agreement and its ordinary Material Take-Off, less what was drawn from
 * stock). Both calls run inside the caller's `withAccount` transaction, so a
 * Task and its drafts are written together or not at all.
 *
 * - The link is `source_task_id` on the request / order (a loose column).
 * - While the request is `draft` (the order `planned`), its Task-derived lines
 *   are replaced on every save: a request's `material` + `labour` lines (any
 *   `other` line the Engineer added is kept), an order's lines. Header fields
 *   the Engineer set — supplier, terms, dates, notes, payment instructions —
 *   are never touched.
 * - Once Issued (or ordered, cancelled, superseded, closed) the document is
 *   left alone: issued documents never change in place (ADR 0003), so later
 *   scope goes through a revision or a Variation as before.
 * - A Task with nothing to ask for gets no draft, and a draft it no longer
 *   needs is discarded.
 * - A stage's first request is `base`; every later Task's request is
 *   `additional` — a separate request whose total adds to the stage's
 *   requirement (CONTEXT.md "Additional Funding Request").
 */

/** No drafts are raised for work under a finished stage. */
const CLOSED_STAGE = new Set(["completed", "cancelled"]);

export async function syncTaskDrafts(
  tx: AccountTx,
  accountId: string,
  taskId: string,
): Promise<void> {
  const [task] = await tx
    .select({
      id: tasks.id,
      stageId: tasks.stageId,
      stageStatus: stages.status,
      description: tasks.description,
      labourOriginal: tasks.labourOriginal,
      labourRevised: tasks.labourRevised,
      subcontractorName: subcontractors.name,
    })
    .from(tasks)
    .innerJoin(stages, eq(stages.id, tasks.stageId))
    .leftJoin(subcontractors, eq(subcontractors.id, tasks.subcontractorId))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task || CLOSED_STAGE.has(task.stageStatus)) return;

  const takeOff = await tx
    .select()
    .from(materialLines)
    .where(
      sql`${materialLines.taskId} = ${taskId} AND ${materialLines.variationId} IS NULL`,
    )
    .orderBy(materialLines.createdAt);

  const draws = await tx
    .select({
      itemKey: materialStockMovements.itemKey,
      unit: materialStockMovements.unit,
      drawn: sql<string>`-SUM(${materialStockMovements.qty})`,
    })
    .from(materialStockMovements)
    .where(
      and(
        eq(materialStockMovements.taskId, taskId),
        eq(materialStockMovements.reason, "drawn_into_takeoff"),
      ),
    )
    .groupBy(materialStockMovements.itemKey, materialStockMovements.unit);

  const { fundingLines, poLines } = buildTaskDraftLines({
    description: task.description,
    subcontractorName: task.subcontractorName,
    labourAmount: task.labourRevised ?? task.labourOriginal,
    takeOff: takeOff.map((l) => ({
      item: l.item,
      description: l.description,
      unit: l.unit,
      qtyOriginal: l.qtyOriginal != null ? Number(l.qtyOriginal) : null,
      qtyRevised: l.qtyRevised != null ? Number(l.qtyRevised) : null,
      estUnitCostOriginal: l.estUnitCostOriginal,
      estUnitCostRevised: l.estUnitCostRevised,
    })),
    drawnFromStock: new Map(
      draws.map((d) => [stockKey(d.itemKey, d.unit), Number(d.drawn)]),
    ),
  });

  await syncFundingDraft(tx, accountId, task.id, task.stageId, fundingLines);
  await syncPurchaseOrderDraft(tx, accountId, task.id, task.stageId, poLines);
}

async function syncFundingDraft(
  tx: AccountTx,
  accountId: string,
  taskId: string,
  stageId: string,
  lines: ReturnType<typeof buildTaskDraftLines>["fundingLines"],
): Promise<void> {
  const [existing] = await tx
    .select({ id: fundingRequests.id, status: fundingRequests.status })
    .from(fundingRequests)
    .where(eq(fundingRequests.sourceTaskId, taskId))
    .orderBy(desc(fundingRequests.createdAt))
    .limit(1);

  if (existing && existing.status !== "draft") return;

  if (existing) {
    await tx
      .delete(fundingRequestLines)
      .where(
        and(
          eq(fundingRequestLines.fundingRequestId, existing.id),
          inArray(fundingRequestLines.category, ["material", "labour"]),
        ),
      );
    const kept = await tx
      .select({ seq: fundingRequestLines.seq })
      .from(fundingRequestLines)
      .where(eq(fundingRequestLines.fundingRequestId, existing.id));
    if (lines.length === 0 && kept.length === 0) {
      await tx.delete(fundingRequests).where(eq(fundingRequests.id, existing.id));
      return;
    }
    const nextSeq = kept.reduce((max, l) => Math.max(max, l.seq), 0) + 1;
    await insertLines(tx, accountId, existing.id, lines, nextSeq);
    await tx
      .update(fundingRequests)
      .set({ updatedAt: new Date() })
      .where(eq(fundingRequests.id, existing.id));
    return;
  }

  if (lines.length === 0) return;

  const [other] = await tx
    .select({ id: fundingRequests.id })
    .from(fundingRequests)
    .where(
      and(
        eq(fundingRequests.stageId, stageId),
        ne(fundingRequests.status, "cancelled"),
      ),
    )
    .limit(1);

  const [row] = await tx
    .insert(fundingRequests)
    .values({
      accountId,
      stageId,
      sourceTaskId: taskId,
      kind: other ? "additional" : "base",
      status: "draft",
      version: 1,
    })
    .returning({ id: fundingRequests.id });
  await insertLines(tx, accountId, row.id, lines);
}

async function syncPurchaseOrderDraft(
  tx: AccountTx,
  accountId: string,
  taskId: string,
  stageId: string,
  lines: ReturnType<typeof buildTaskDraftLines>["poLines"],
): Promise<void> {
  const [existing] = await tx
    .select({ id: purchaseOrders.id, status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.sourceTaskId, taskId))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(1);

  if (existing && existing.status !== "planned") return;

  if (existing) {
    if (lines.length === 0) {
      await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, existing.id));
      return;
    }
    await tx
      .delete(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, existing.id));
    await insertPoLines(tx, accountId, existing.id, lines);
    await tx
      .update(purchaseOrders)
      .set({ updatedAt: new Date() })
      .where(eq(purchaseOrders.id, existing.id));
    return;
  }

  if (lines.length === 0) return;

  const [row] = await tx
    .insert(purchaseOrders)
    .values({
      accountId,
      stageId,
      sourceTaskId: taskId,
      supplierId: null,
      status: "planned",
    })
    .returning({ id: purchaseOrders.id });
  await insertPoLines(tx, accountId, row.id, lines);
}

/**
 * Discard a Task's still-editable drafts before the Task itself is deleted.
 * An Issued request or an ordered PO is kept: it is a record already sent to
 * the client or supplier, and outlives the Task (the loose link just dangles).
 */
export async function discardTaskDrafts(tx: AccountTx, taskId: string): Promise<void> {
  await tx
    .delete(fundingRequests)
    .where(
      and(eq(fundingRequests.sourceTaskId, taskId), eq(fundingRequests.status, "draft")),
    );
  await tx
    .delete(purchaseOrders)
    .where(
      and(eq(purchaseOrders.sourceTaskId, taskId), eq(purchaseOrders.status, "planned")),
    );
}

/**
 * The Funding Requests and Purchase Orders a Task's saves have raised, newest
 * first — ids only; the Task page reads each through `getFundingRequest` /
 * `getPurchaseOrder` for its derived status.
 */
export async function getTaskSourcedDocumentIds(taskId: string): Promise<{
  fundingRequestIds: string[];
  purchaseOrderIds: string[];
}> {
  return withAccount(async (tx) => {
    const frs = await tx
      .select({ id: fundingRequests.id })
      .from(fundingRequests)
      .where(eq(fundingRequests.sourceTaskId, taskId))
      .orderBy(desc(fundingRequests.createdAt));
    const pos = await tx
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.sourceTaskId, taskId))
      .orderBy(desc(purchaseOrders.createdAt));
    return {
      fundingRequestIds: frs.map((r) => r.id),
      purchaseOrderIds: pos.map((r) => r.id),
    };
  });
}
