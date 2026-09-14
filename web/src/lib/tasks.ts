/**
 * The Task + Material Take-Off domain — view-model types and pure helpers, no
 * data access, safe to import from client components (Slice 2.4b).
 *
 * A Task is a unit of work within a Stage, assigned one Subcontractor (Phase 1
 * decision 05). Its labour agreement lives on the Task (`labourOriginal` /
 * `labourRevised`); the unpaid remainder feeds Open Labour Commitments in the
 * projection. The Material Take-Off lines under a Task carry the Engineer's
 * estimate — they feed Material Variance at closeout and cut re-entry into
 * Purchase Orders, but are not themselves part of the float calculation.
 *
 * The Approved-Estimate revision chain (guidelines §17) and the actual-cost
 * side are deferred — Slice 2.4b writes only the `*Original` estimate columns.
 */

/** The `task_status` enum. */
export type TaskStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function taskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? "Planned";
}

export interface MaterialTakeOffLine {
  id: string;
  seq: number;
  item: string;
  description: string | null;
  /**
   * Set only on a row an approved Variation appended (Phase 3 ticket 01 §3);
   * `null` for every ordinary take-off line. A Variation-tagged row reconciles
   * against its Variation's `material_impact`, never against a per-line
   * original/revised split of its own (ticket 03's cross-reference note).
   */
  variationId: string | null;
  /**
   * The *current* estimated quantity — `qty_revised` once either side of the
   * revised pair has been written, else `qty_original` (ticket 03 §3's
   * "revised pair where a line has one, else the original pair"). `null` if
   * not yet quantified.
   */
  qty: number | null;
  unit: string;
  /** The current estimated unit cost (see `qty`), whole TZS; `null` if unpriced. */
  estUnitCost: number | null;
  /** The frozen Approved Estimate quantity, before any revision — `null` until the stage locks and a first estimate was recorded, or for a line added after lock. */
  qtyOriginal: number | null;
  /** The frozen Approved Estimate unit cost — see `qtyOriginal`. */
  estUnitCostOriginal: number | null;
}

/**
 * The pair-fallback used everywhere a take-off line's *current* figures are
 * read (ticket 03 §3): once either side of the revised pair has been written,
 * the revised pair is the current one (falling back within the pair to the
 * original side that wasn't touched); otherwise the original pair stands.
 */
export function currentTakeOffFigures(row: {
  qtyOriginal: number | null;
  qtyRevised: number | null;
  estUnitCostOriginal: number | null;
  estUnitCostRevised: number | null;
}): { qty: number | null; estUnitCost: number | null } {
  const hasRevision = row.qtyRevised != null || row.estUnitCostRevised != null;
  return hasRevision
    ? {
        qty: row.qtyRevised ?? row.qtyOriginal,
        estUnitCost: row.estUnitCostRevised ?? row.estUnitCostOriginal,
      }
    : { qty: row.qtyOriginal, estUnitCost: row.estUnitCostOriginal };
}

/** The estimated cost of one take-off line — `qty × estUnitCost`, or 0 if either is missing. */
export function lineEstimate(line: MaterialTakeOffLine): number {
  if (line.qty == null || line.estUnitCost == null) return 0;
  return Math.round(line.qty * line.estUnitCost);
}

export interface Task {
  id: string;
  stageId: string;
  stageName: string;
  projectId: string;

  description: string;
  seq: number;

  subcontractorId: string | null;
  /** The register's current name, or `null` when unassigned / the link is broken. */
  subcontractorName: string | null;

  /** The live labour agreement amount — `labourRevised ?? labourOriginal`. */
  labourAmount: number | null;
  retentionPercent: number;
  progressPercent: number;
  status: TaskStatus;
  startedOn: string | null;
  completedOn: string | null;
  notes: string | null;

  materialLines: MaterialTakeOffLine[];
}

/** Σ line estimates for a Task's take-off (guidelines §51 "one calculation path"). */
export function estimatedMaterialCost(task: Pick<Task, "materialLines">): number {
  return task.materialLines.reduce((sum, l) => sum + lineEstimate(l), 0);
}
