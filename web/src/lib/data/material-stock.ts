import "server-only";

import { sql } from "drizzle-orm";

import { getCurrentAccountId } from "./account-context";
import { materialStockMovements, stages } from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Material Stock ledger DAL (Phase 3 ticket 06) — an append-only,
 * per-project running balance of surplus material carried forward from a
 * closed stage, drawn back into a later Material Take-Off, or written off.
 *
 * No `accountId` in most signatures (`withAccount` sets the tenant GUC,
 * Postgres RLS is the backstop), except the two writes designed to run
 * *inside a caller's own transaction* (`carryForwardSurplus`, `writeOffStock`
 * — both take `tx` directly, since Stage Closeout, ticket 05/Slice 3.4, must
 * commit its status change and its stock movements atomically) — those still
 * resolve the account id themselves via the cached `getCurrentAccountId()`,
 * which reads the session, not the transaction.
 *
 * Balance is always `SUM(qty)`, never stored — see `schema/material-stock-
 * movements.ts` for the full design rationale.
 */

export interface StockLine {
  item: string;
  unit: string;
  qty: number;
}

export interface StockBalance {
  /** The normalised match key (`lower(trim(item))`) — also the display label. */
  itemKey: string;
  unit: string;
  qty: number;
}

export interface StockMovement {
  id: string;
  itemKey: string;
  unit: string;
  qty: number;
  reason: "carried_forward" | "drawn_into_takeoff" | "written_off";
  createdAt: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

async function projectIdForStage(
  tx: AccountTx,
  stageId: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ projectId: stages.projectId })
    .from(stages)
    .where(sql`${stages.id} = ${stageId}`)
    .limit(1);
  return row?.projectId ?? null;
}

/** Current on-hand balance for one normalised item/unit in a project. `0` if none. */
async function balanceFor(
  tx: AccountTx,
  projectId: string,
  itemKey: string,
  unit: string,
): Promise<number> {
  const { rows } = await tx.execute<{ balance: string | null }>(sql`
    SELECT COALESCE(SUM(qty), 0) AS balance
    FROM material_stock_movements
    WHERE project_id = ${projectId} AND item_key = ${itemKey} AND unit = ${unit}
  `);
  return rows[0]?.balance != null ? Number(rows[0].balance) : 0;
}

/**
 * Every material with a positive on-hand balance in a project — the "Material
 * Stock" screen and the Material Take-Off form's "On site: {qty} {unit}"
 * lookup both read this.
 *
 * `tx`-scoped so a caller already inside its own transaction (Phase 4 Slice
 * 4.2's `closeStage`, freezing this same balance into the Stage Closeout
 * Report snapshot) can call it directly, same posture as
 * `computeStageFinancials` — avoids nesting a second `withAccount`/
 * `db.transaction()` inside the caller's own.
 */
export async function stockBalancesTx(
  tx: AccountTx,
  projectId: string,
): Promise<StockBalance[]> {
  const { rows } = await tx.execute<{
    itemKey: string;
    unit: string;
    balance: string;
  }>(sql`
    SELECT item_key AS "itemKey", unit, SUM(qty) AS balance
    FROM material_stock_movements
    WHERE project_id = ${projectId}
    GROUP BY item_key, unit
    HAVING SUM(qty) > 0
    ORDER BY item_key ASC
  `);
  return rows.map((r) => ({
    itemKey: r.itemKey,
    unit: r.unit,
    qty: Number(r.balance),
  }));
}

/** `withAccount`-wrapped read for screens — wraps `stockBalancesTx`. */
export async function getStockBalances(projectId: string): Promise<StockBalance[]> {
  return withAccount((tx) => stockBalancesTx(tx, projectId));
}

/** The most recent movements in a project, newest first — the ledger's audit trail. */
export async function listStockMovements(
  projectId: string,
  limit = 50,
): Promise<StockMovement[]> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select({
        id: materialStockMovements.id,
        itemKey: materialStockMovements.itemKey,
        unit: materialStockMovements.unit,
        qty: materialStockMovements.qty,
        reason: materialStockMovements.reason,
        createdAt: materialStockMovements.createdAt,
      })
      .from(materialStockMovements)
      .where(sql`${materialStockMovements.projectId} = ${projectId}`)
      .orderBy(sql`${materialStockMovements.createdAt} DESC`)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      itemKey: r.itemKey,
      unit: r.unit,
      qty: Number(r.qty),
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
  });
}

/**
 * Distinct known material item names for the `<datalist>` autocomplete
 * (ticket 06 §4/§6) — a cheap typo-drift mitigation, not a real Material List
 * register. Sourced account-wide from the ledger's own `item_key`s plus the
 * most recently used Material Take-Off item names (their original casing is
 * kept; the ledger's normalised keys are shown as-is).
 */
export async function listKnownMaterialItems(): Promise<string[]> {
  return withAccount(async (tx) => {
    const stockRows = await tx
      .selectDistinct({ item: materialStockMovements.itemKey })
      .from(materialStockMovements);

    const { rows: lineRows } = await tx.execute<{ item: string }>(sql`
      SELECT item, MAX(created_at) AS latest
      FROM material_lines
      GROUP BY item
      ORDER BY latest DESC
      LIMIT 200
    `);

    const items = new Set<string>();
    for (const r of stockRows) items.add(r.item);
    for (const r of lineRows) items.add(r.item);
    return Array.from(items).sort((a, b) => a.localeCompare(b));
  });
}

/** Read-only per-item/unit balance lookup, for a single known item. */
export async function getStockBalance(
  projectId: string,
  item: string,
  unit: string,
): Promise<number> {
  return withAccount((tx) => balanceFor(tx, projectId, normalize(item), normalize(unit)));
}

function positiveLines(lines: StockLine[]): StockLine[] {
  return lines.filter((l) => l.qty > 0 && l.item.trim() !== "" && l.unit.trim() !== "");
}

/**
 * Increment stock — the **only** write path that adds to the ledger (ticket
 * 06 §3). Called once by Stage Closeout (ticket 05, Slice 3.4) when its
 * Materials checklist step resolves a surplus line to Carried Forward; one
 * `carried_forward` movement per line. Runs inside the caller's own
 * transaction so the stage's status change and the stock increment commit
 * together.
 *
 * This exact name/signature is Slice 3.4's contract — do not change it
 * without updating that caller.
 */
export async function carryForwardSurplus(
  tx: AccountTx,
  stageId: string,
  lines: StockLine[],
): Promise<void> {
  const toInsert = positiveLines(lines);
  if (toInsert.length === 0) return;
  const accountId = await getCurrentAccountId();
  const projectId = await projectIdForStage(tx, stageId);
  if (!projectId) return;

  await tx.insert(materialStockMovements).values(
    toInsert.map((l) => ({
      accountId,
      projectId,
      itemKey: normalize(l.item),
      unit: normalize(l.unit),
      qty: String(l.qty),
      reason: "carried_forward" as const,
      sourceStageId: stageId,
    })),
  );
}

/**
 * Decrement stock for a loss (ticket 06 §5) — called by Stage Closeout when a
 * surplus line resolves to Written Off. Only ever removes quantity that is
 * actually on hand from an earlier `carryForwardSurplus`: each line's
 * write-off is capped at `min(qty, currentBalance)`, so a fresh surplus
 * that's written off at the very closeout that discovered it (balance still
 * `0` for that item/unit) writes **no** movement at all — exactly ticket 06's
 * "a fresh-surplus Written Off touches the ledger not at all" rule, computed
 * here rather than pushed onto the caller. Runs inside the caller's own
 * transaction, same posture as `carryForwardSurplus`.
 */
export async function writeOffStock(
  tx: AccountTx,
  stageId: string,
  lines: StockLine[],
): Promise<void> {
  const candidates = positiveLines(lines);
  if (candidates.length === 0) return;
  const accountId = await getCurrentAccountId();
  const projectId = await projectIdForStage(tx, stageId);
  if (!projectId) return;

  const toInsert: (typeof materialStockMovements.$inferInsert)[] = [];
  for (const l of candidates) {
    const itemKey = normalize(l.item);
    const unit = normalize(l.unit);
    const balance = await balanceFor(tx, projectId, itemKey, unit);
    const qtyToWriteOff = Math.min(l.qty, Math.max(balance, 0));
    if (qtyToWriteOff <= 0) continue;
    toInsert.push({
      accountId,
      projectId,
      itemKey,
      unit,
      qty: String(-qtyToWriteOff),
      reason: "written_off",
      sourceStageId: stageId,
    });
  }
  if (toInsert.length > 0) await tx.insert(materialStockMovements).values(toInsert);
}

/**
 * Decrement stock for the consuming side (ticket 06 §4) — the Material
 * Take-Off line form's manual, bounded "Apply from stock" input. Called from
 * `tasks.ts`'s `createTask`/`updateTask` inside their own transaction, for
 * every submitted line that named a positive `applyFromStock` amount.
 * Server-side capped at `min(requested, currentBalance)` regardless of what
 * the form already bounded client-side — the defensive backstop every other
 * loose-input write in this DAL follows.
 */
export async function drawFromStock(
  tx: AccountTx,
  accountId: string,
  projectId: string,
  taskId: string,
  lines: StockLine[],
): Promise<void> {
  const candidates = positiveLines(lines);
  if (candidates.length === 0) return;

  const toInsert: (typeof materialStockMovements.$inferInsert)[] = [];
  for (const l of candidates) {
    const itemKey = normalize(l.item);
    const unit = normalize(l.unit);
    const balance = await balanceFor(tx, projectId, itemKey, unit);
    const qtyToDraw = Math.min(l.qty, Math.max(balance, 0));
    if (qtyToDraw <= 0) continue;
    toInsert.push({
      accountId,
      projectId,
      itemKey,
      unit,
      qty: String(-qtyToDraw),
      reason: "drawn_into_takeoff",
      taskId,
    });
  }
  if (toInsert.length > 0) await tx.insert(materialStockMovements).values(toInsert);
}
