import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type {
  StageCloseoutGates,
  StageCloseoutPORef,
  StageCloseoutTaskRef,
  StageCloseoutVariationRef,
} from "@/lib/stage-closeout";
import { CLOSEABLE_STAGE_STATUSES, stageCloseoutBlockers } from "@/lib/stage-closeout";
import type { SurplusLineInput } from "@/lib/validation/stage-closeout";

import { carryForwardSurplus, writeOffStock, type StockLine } from "./material-stock";
import { computeStageFinancials } from "./projection";
import { purchaseOrders, stages, tasks, variations } from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Stage Closeout DAL (Phase 3 ticket 05) — the read side re-derives the
 * same four hard gates `closeStage` enforces, so the checklist screen and the
 * transaction can never disagree; the write side is the atomic `Close Stage`
 * transaction plus the post-closeout surplus-materials resolution that calls
 * straight into ticket 06's `carryForwardSurplus` / `writeOffStock`.
 *
 * No `accountId` in any signature — `withAccount` sets the tenant GUC and
 * Postgres RLS is the backstop, same posture as every other DAL file here.
 */

export type { StageCloseoutGates };

/**
 * Re-derive the stage's checklist gates from the live rows, inside a caller's
 * own transaction — internal, `tx`-scoped, same posture as
 * `carryForwardSurplus`/`writeOffStock`: `closeStage` calls this directly so
 * its own re-check runs on the same connection/transaction as its status
 * write, rather than nesting a second `withAccount` transaction inside the
 * first. Returns `null` for a missing / cross-account stage.
 */
async function loadCloseoutGates(
  tx: AccountTx,
  stageId: string,
): Promise<StageCloseoutGates | null> {
  const [stage] = await tx
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stage) return null;

  const openTasks = (await tx
    .select({ id: tasks.id, seq: tasks.seq, description: tasks.description })
    .from(tasks)
    .where(sql`${tasks.stageId} = ${stageId} AND ${tasks.status} NOT IN ('completed', 'cancelled')`)
    .orderBy(asc(tasks.seq))) as StageCloseoutTaskRef[];

  const nonTerminalVariations = (await tx
    .select({
      id: variations.id,
      displayNumber: variations.displayNumber,
      status: variations.status,
      description: variations.description,
    })
    .from(variations)
    .where(sql`${variations.stageId} = ${stageId} AND ${variations.status} IN ('draft', 'approved')`)
    .orderBy(asc(variations.requestedAt))) as StageCloseoutVariationRef[];

  const orderedPurchaseOrders = (await tx
    .select({ id: purchaseOrders.id, displayNumber: purchaseOrders.displayNumber })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.stageId, stageId), eq(purchaseOrders.status, "ordered")))
    .orderBy(asc(purchaseOrders.createdAt))) as StageCloseoutPORef[];

  const financials = await computeStageFinancials(tx, stageId);

  return {
    openTasks,
    nonTerminalVariations,
    orderedPurchaseOrders,
    openLabourCommitments: financials.openLabourCommitments,
  };
}

/**
 * Re-derive the stage's checklist gates from the live rows — the same shape
 * `closeStage` re-checks server-side. Returns `null` for a missing /
 * cross-account stage. This is what the checklist screen reads.
 */
export async function getStageCloseoutGates(
  stageId: string,
): Promise<StageCloseoutGates | null> {
  return withAccount((tx) => loadCloseoutGates(tx, stageId));
}

export type CloseStageResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-closeable-status" | "gates-failed" };

/**
 * The atomic `Close Stage` transaction (ticket 05 §2). Available only from
 * `active` or `ready_for_closeout` (not `planned`, `awaiting_funding`,
 * `on_hold`, or `cancelled`). Re-checks all four hard gates server-side —
 * never trusts the checklist screen's own read, the same defensive posture
 * `issuePurchaseOrder`/`approveVariation` already follow for their own
 * preconditions. Sets `status = 'completed'` and `completed_on = today`; no
 * new column, no new enum value (ticket 05 §2 — `completed` already existed).
 */
export async function closeStage(stageId: string): Promise<CloseStageResult> {
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id, status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return { ok: false as const, reason: "not-found" as const };
    if (!CLOSEABLE_STAGE_STATUSES.has(stage.status)) {
      return { ok: false as const, reason: "not-closeable-status" as const };
    }

    const gates = await loadCloseoutGates(tx, stageId);
    if (!gates || stageCloseoutBlockers(gates).length > 0) {
      return { ok: false as const, reason: "gates-failed" as const };
    }

    await tx
      .update(stages)
      .set({
        status: "completed",
        completedOn: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId));

    return { ok: true as const };
  });
}

/**
 * The post-closeout "Carry Forward Surplus" action (ticket 05 §3, ticket 06
 * §3/§5): resolves the Engineer's identified surplus lines, each to either
 * Carried Forward (`carryForwardSurplus`) or Written Off (`writeOffStock`) —
 * ticket 06's own "Consequences for the spec" names Stage Closeout as the
 * owner of calling both. Only available once the stage is actually
 * `completed`; `false` for a missing/cross-account/not-yet-closed stage.
 * Runs in its own transaction, separate from `closeStage` — surplus is
 * identified and resolved as a **post**-closeout review step (ticket 05's own
 * "post-closeout actions" list), not a precondition of the close itself.
 */
export async function resolveSurplusMaterials(
  stageId: string,
  lines: SurplusLineInput[],
): Promise<boolean> {
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id, status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage || stage.status !== "completed") return false;

    const carryForwardLines: StockLine[] = lines
      .filter((l) => l.resolution === "carry_forward")
      .map((l) => ({ item: l.item, unit: l.unit, qty: l.qty }));
    const writeOffLines: StockLine[] = lines
      .filter((l) => l.resolution === "written_off")
      .map((l) => ({ item: l.item, unit: l.unit, qty: l.qty }));

    await carryForwardSurplus(tx, stageId, carryForwardLines);
    await writeOffStock(tx, stageId, writeOffLines);
    return true;
  });
}
