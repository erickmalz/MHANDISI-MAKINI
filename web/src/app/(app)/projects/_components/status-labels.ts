import type { MessageKey } from "@/lib/i18n/types";

/**
 * Stored stage status (the `StageStatus` display value) -> its label key.
 * A value not listed here is shown as stored, so a new status never blanks
 * the screen.
 */
export const STAGE_STATUS_LABEL: Record<string, MessageKey> = {
  Planned: "funding.stageStatus.planned",
  Active: "funding.stageStatus.active",
  "Awaiting Funding": "funding.stageStatus.awaitingFunding",
  "On Hold": "funding.stageStatus.onHold",
  "Ready for Closeout": "funding.stageStatus.readyForCloseout",
  Completed: "funding.stageStatus.completed",
  Cancelled: "funding.stageStatus.cancelled",
};

/** The English task status label (from `taskStatusLabel`) -> its label key. */
export const TASK_STATUS_LABEL: Record<string, MessageKey> = {
  Planned: "reports.taskStatus.planned",
  Active: "reports.taskStatus.active",
  "On hold": "reports.taskStatus.onHold",
  Completed: "reports.taskStatus.completed",
  Cancelled: "reports.taskStatus.cancelled",
};
