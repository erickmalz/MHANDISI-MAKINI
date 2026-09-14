/**
 * Pure view helpers over the `Project` view-model — no data access, safe to
 * import from client components.
 */
import type { Project, Stage, StageStatus } from "./types";

/**
 * The stage the engineer is currently working, or `undefined` when the project
 * has no stages yet (a new Account starts empty). Callers must handle the
 * empty case — there is no "phantom" stage.
 */
export function getCurrentStage(project: Project): Stage | undefined {
  if (project.stages.length === 0) return undefined;
  return (
    project.stages.find((s) => s.id === project.currentStageId) ??
    project.stages.slice().sort((a, b) => a.seq - b.seq)[0]
  );
}

/** DB `stage_status` enum → the display label used across the UI. */
const STAGE_STATUS_LABELS: Record<string, StageStatus> = {
  planned: "Planned",
  active: "Active",
  awaiting_funding: "Awaiting Funding",
  on_hold: "On Hold",
  ready_for_closeout: "Ready for Closeout",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function stageStatusLabel(dbValue: string): StageStatus {
  return STAGE_STATUS_LABELS[dbValue] ?? "Planned";
}
