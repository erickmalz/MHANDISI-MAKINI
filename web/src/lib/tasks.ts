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
  /** Estimated quantity (`qty_original`); `null` if not yet quantified. */
  qty: number | null;
  unit: string;
  /** Estimated unit cost (`est_unit_cost_original`), whole TZS; `null` if unpriced. */
  estUnitCost: number | null;
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
