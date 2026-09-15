/**
 * Pure Project Closeout view-model (Phase 4 ticket 04) — no data access, safe
 * to import from a client component. Mirrors `src/lib/stage-closeout.ts`:
 * the DAL (`src/lib/data/project-closeout.ts`) reads the raw rows, this
 * module turns them into the one hard gate plus a `canComplete` verdict.
 *
 * Ticket 04's Answer: "Complete Project is gated on every one of the
 * project's Stages already being completed (mirroring Stage Closeout's own
 * hard-gate philosophy)." A Stage's *terminal* statuses are `completed` and
 * `cancelled` — `Close Stage` only ever writes `completed`, but a Stage can
 * independently reach `cancelled` (abandoned scope), and nothing in this
 * codebase provides an "un-cancel" path back to open work, the same
 * terminal-status posture `stage-closeout.ts` already applies to Tasks
 * (`completed`/`cancelled` both satisfy its "every task terminal" gate) and
 * Variations (`rejected`/`cancelled` both satisfy its "no outstanding
 * variation" gate). Treating a `cancelled` Stage as satisfying this gate too
 * is the consistent reading of "already being completed" against that
 * precedent, not a literal "every Stage's status column reads exactly
 * `completed`" — the latter would make any project with one abandoned Stage
 * permanently uncompletable, which nothing in the ticket intends.
 */

export type ProjectCloseoutOpenStageRef = {
  id: string;
  seq: number;
  name: string;
  status: string;
};

export interface ProjectCloseoutGates {
  /** `true` once the project has at least one Stage — see `no-stages` below. */
  hasStages: boolean;
  /** Every Stage whose status is neither `completed` nor `cancelled`. */
  openStages: ProjectCloseoutOpenStageRef[];
}

export interface ProjectCloseoutBlocker {
  key: "no-stages" | "open-stage";
  label: string;
}

/** A Stage's two terminal statuses — see the module doc above. */
export const TERMINAL_STAGE_STATUSES = new Set(["completed", "cancelled"]);

/** The Project statuses `Complete Project` is available from. */
export const COMPLETABLE_PROJECT_STATUSES = new Set(["active", "on_hold"]);

/** The Project statuses `Archive Project` is available from (ticket 04's Answer: gated only on `completed`). */
export const ARCHIVABLE_PROJECT_STATUSES = new Set(["completed"]);

/**
 * The one hard-blocking check, evaluated in order. A project with no Stages
 * at all is also blocked — "every Stage is completed" holds vacuously true
 * for zero Stages, which would let a freshly created, still-empty project
 * complete immediately; nothing in the ticket intends that, so it is its own
 * named blocker rather than silently falling out of an empty `openStages`.
 */
export function projectCloseoutBlockers(
  gates: ProjectCloseoutGates,
): ProjectCloseoutBlocker[] {
  const blockers: ProjectCloseoutBlocker[] = [];
  if (!gates.hasStages) {
    blockers.push({ key: "no-stages", label: "This project has no stages yet" });
    return blockers;
  }
  if (gates.openStages.length > 0) {
    blockers.push({
      key: "open-stage",
      label: `${gates.openStages.length} stage${gates.openStages.length === 1 ? "" : "s"} not yet closed`,
    });
  }
  return blockers;
}

export function canCompleteProject(
  status: string,
  gates: ProjectCloseoutGates,
): boolean {
  return (
    COMPLETABLE_PROJECT_STATUSES.has(status) &&
    projectCloseoutBlockers(gates).length === 0
  );
}

export function canArchiveProject(status: string): boolean {
  return ARCHIVABLE_PROJECT_STATUSES.has(status);
}
