import type { MessageKey } from "@/lib/i18n/types";
import type { StageStatus } from "@/lib/types";
import type { TaskStatus } from "@/lib/tasks";

/**
 * Stored status values stay as they are; only their labels are translated.
 * These maps turn a stored value into the catalogue key for its label, and
 * the compiler checks every key exists.
 */
export const STAGE_STATUS_KEYS: Record<StageStatus, MessageKey> = {
  Planned: "status.stage.planned",
  Active: "status.stage.active",
  "Awaiting Funding": "status.stage.awaitingFunding",
  "On Hold": "status.stage.onHold",
  "Ready for Closeout": "status.stage.readyForCloseout",
  Completed: "status.stage.completed",
  Cancelled: "status.stage.cancelled",
};

/** Database `stage_status` value → label key (used by the stage form). */
export const STAGE_DB_STATUS_KEYS = {
  planned: "status.stage.planned",
  active: "status.stage.active",
  awaiting_funding: "status.stage.awaitingFunding",
  on_hold: "status.stage.onHold",
  ready_for_closeout: "status.stage.readyForCloseout",
  completed: "status.stage.completed",
  cancelled: "status.stage.cancelled",
} as const satisfies Record<string, MessageKey>;

export const TASK_STATUS_KEYS: Record<TaskStatus, MessageKey> = {
  planned: "status.task.planned",
  active: "status.task.active",
  on_hold: "status.task.onHold",
  completed: "status.task.completed",
  cancelled: "status.task.cancelled",
};

export const PROJECT_STATUS_KEYS = {
  active: "status.project.active",
  on_hold: "status.project.onHold",
  completed: "status.project.completed",
  archived: "status.project.archived",
} as const satisfies Record<string, MessageKey>;
