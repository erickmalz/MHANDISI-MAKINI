import "server-only";

import { asc, eq } from "drizzle-orm";

import { materialVariance } from "@/lib/finance";
import { getCurrentStage, stageStatusLabel } from "@/lib/project-view";
import type { Project, Stage } from "@/lib/types";

import { computeStageAlerts, deriveProjectAlerts } from "./alerts";
import { projects, stages } from "./schema";
import { readProjectFinancials } from "./stage-financials";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The read side of the data-access layer (multi-tenancy ticket 08 §3).
 *
 * Intent-named functions, no `accountId` in any signature — `withAccount`
 * injects the tenant key and Postgres RLS is the backstop, so a caller cannot
 * reach another Account's data and a cross-account id simply resolves to
 * `null` (→ the screen calls `notFound()`, ticket 06's "always 404" rule).
 *
 * Reads return the nested `Project` view-model the screens already expect;
 * the prototype's `@/lib/mock-data` (deleted in Slice 2.6) has been fully
 * replaced by per-Account records read through this layer.
 */

async function buildStages(tx: AccountTx, projectId: string): Promise<Stage[]> {
  const rows = await tx
    .select({
      id: stages.id,
      name: stages.name,
      seq: stages.seq,
      status: stages.status,
      progressPercent: stages.progressPercent,
    })
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .orderBy(asc(stages.seq));
  const { byStage } = await readProjectFinancials(tx, projectId);

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    seq: s.seq,
    status: stageStatusLabel(s.status),
    progressPercent: s.progressPercent,
    financials: byStage.get(s.id)!,
  }));
}

async function toProject(
  tx: AccountTx,
  row: {
    id: string;
    projectCode: string;
    name: string;
    clientName: string;
    site: string;
    currentStageId: string | null;
  },
  builtStages: Stage[],
): Promise<Project> {
  const project: Project = {
    id: row.id,
    code: row.projectCode,
    name: row.name,
    clientName: row.clientName,
    site: row.site,
    currency: "TZS",
    currentStageId: row.currentStageId,
    stages: builtStages,
    alerts: [],
  };
  const currentStage = getCurrentStage(project);
  project.alerts = [
    ...deriveProjectAlerts(currentStage),
    ...(currentStage ? await computeStageAlerts(tx, row.id, currentStage.id) : []),
  ];
  return project;
}

const projectColumns = {
  id: projects.id,
  projectCode: projects.projectCode,
  name: projects.name,
  clientName: projects.clientName,
  site: projects.site,
  currentStageId: projects.currentStageId,
} as const;

/** Every project in the Account, oldest first — the "choose a project" picker. */
export async function listProjects(): Promise<Project[]> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select(projectColumns)
      .from(projects)
      .orderBy(asc(projects.createdAt));

    const result: Project[] = [];
    for (const row of rows) {
      result.push(await toProject(tx, row, await buildStages(tx, row.id)));
    }
    return result;
  });
}

/** One project with every stage's freshly-projected financials, or `null`. */
export async function getProjectOverview(
  projectId: string,
): Promise<Project | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select(projectColumns)
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) return null;
    return toProject(tx, row, await buildStages(tx, row.id));
  });
}

/**
 * Accumulated Material Variance (Phase 3 ticket 03 §5) — Σ Material Variance
 * across every stage of the project, live-computed, never stored: what
 * "credited to Petty Cash" means given Petty Cash was never a separately
 * tracked balance (`CONTEXT.md`) — an underspend against the estimate simply
 * shows up here as reporting headroom, not a posted ledger event. Material
 * Variance is linear, so it is the formula applied to the project roll-up.
 */
export async function getAccumulatedMaterialVariance(
  projectId: string,
): Promise<number> {
  return withAccount(async (tx) =>
    materialVariance((await readProjectFinancials(tx, projectId)).totals),
  );
}
