/**
 * The Funding Request worksheet domain — types and pure helpers, promoted out
 * of the retired `funding-mock.ts` (multi-tenancy ticket 08 §5).
 *
 * A stage's material and labour lines are entered directly on the Funding
 * Request in v1 — the separate take-off / labour-agreement module stays
 * deferred (ticket 08 §2). No data access here; safe to import from client
 * components. Slice 2.5 rebuilds the Funding Request builder on the DAL against
 * these types.
 */

export interface MaterialLine {
  item: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface LabourLine {
  subcontractor: string;
  amount: number;
}

export interface TaskLine {
  id: string;
  name: string;
  material: MaterialLine[];
  labour: LabourLine[];
}

/** Σ material line cost for a task. */
export function materialTotal(t: TaskLine): number {
  return t.material.reduce((sum, m) => sum + m.qty * m.unitCost, 0);
}

/** Σ labour line amount for a task. */
export function labourTotal(t: TaskLine): number {
  return t.labour.reduce((sum, l) => sum + l.amount, 0);
}
