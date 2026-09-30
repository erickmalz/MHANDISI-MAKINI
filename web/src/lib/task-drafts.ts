import { currentTakeOffFigures } from "./tasks";

/**
 * Task-sourced drafts: the lines a Task's requirements put on its own draft
 * Funding Request and its own planned Purchase Order (one of each per Task).
 * Pure and isomorphic — the DAL (`lib/data/task-drafts.ts`) reads the Task,
 * its ordinary take-off and its stock draws, and writes what this returns.
 *
 * Both sides ask only for the **shortfall**: a take-off line's current qty
 * less what was already drawn into this Task from Material Stock (CONTEXT.md
 * "Material Stock" — never ask the client, or a supplier, for material that
 * is already on site).
 */

export interface TaskDraftTakeOffLine {
  item: string;
  description: string | null;
  unit: string;
  qtyOriginal: number | null;
  qtyRevised: number | null;
  estUnitCostOriginal: number | null;
  estUnitCostRevised: number | null;
}

export interface TaskDraftSource {
  description: string;
  subcontractorName: string | null;
  /** The labour agreement's current value (revised if set, else original). */
  labourAmount: number | null;
  takeOff: TaskDraftTakeOffLine[];
  /** Quantity already drawn from stock into this Task, keyed by `stockKey`. */
  drawnFromStock: Map<string, number>;
}

export interface TaskDraftFundingLine {
  category: "material" | "labour";
  item: string;
  description?: string;
  qty?: number;
  unit?: string;
  unitCost?: number;
  amount: number;
}

export interface TaskDraftPoLine {
  item: string;
  description?: string;
  unit: string;
  qtyOrdered: number;
  /** 0 when the take-off has no estimate — the PO form makes the Engineer enter it. */
  unitPrice: number;
}

/** The Material Stock ledger's item/unit identity (trimmed, lower-cased). */
export function stockKey(item: string, unit: string): string {
  return `${item.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}

const EPSILON = 1e-9;

/** A Funding Request line's `item` is capped at 160 chars (`fundingLineSchema`). */
const ITEM_MAX = 160;

function fitItem(s: string): string {
  return s.length <= ITEM_MAX ? s : `${s.slice(0, ITEM_MAX - 1)}…`;
}

export function buildTaskDraftLines(source: TaskDraftSource): {
  fundingLines: TaskDraftFundingLine[];
  poLines: TaskDraftPoLine[];
} {
  // Stock drawn for an item is used up line by line, so two take-off lines
  // of the same material don't each net off the full draw.
  const stockLeft = new Map(source.drawnFromStock);
  const fundingLines: TaskDraftFundingLine[] = [];
  const poLines: TaskDraftPoLine[] = [];

  for (const line of source.takeOff) {
    const { qty, estUnitCost } = currentTakeOffFigures(line);
    if (qty == null || qty <= EPSILON) continue;

    const key = stockKey(line.item, line.unit);
    const drawn = Math.min(stockLeft.get(key) ?? 0, qty);
    stockLeft.set(key, (stockLeft.get(key) ?? 0) - drawn);
    const shortfall = qty - drawn;
    if (shortfall <= EPSILON) continue;

    const description = line.description ?? undefined;
    poLines.push({
      item: line.item,
      description,
      unit: line.unit,
      qtyOrdered: shortfall,
      unitPrice: estUnitCost ?? 0,
    });

    const amount = estUnitCost != null ? Math.round(shortfall * estUnitCost) : 0;
    if (amount > 0) {
      fundingLines.push({
        category: "material",
        item: line.item,
        description,
        qty: shortfall,
        unit: line.unit,
        unitCost: estUnitCost ?? undefined,
        amount,
      });
    }
  }

  if (source.labourAmount != null && source.labourAmount > 0) {
    fundingLines.push({
      category: "labour",
      item: fitItem(
        source.subcontractorName
          ? `Labour — ${source.description} (${source.subcontractorName})`
          : `Labour — ${source.description}`,
      ),
      amount: source.labourAmount,
    });
  }

  return { fundingLines, poLines };
}
