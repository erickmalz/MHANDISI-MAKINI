import "server-only";

import { asc, eq } from "drizzle-orm";

import { getCurrentStage, stageStatusLabel } from "@/lib/project-view";
import type { Project, Stage } from "@/lib/types";

import { deriveProjectAlerts } from "./alerts";
import { computeStageFinancials } from "./projection";
import { projects, stages } from "./schema";
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

  const built: Stage[] = [];
  for (const s of rows) {
    built.push({
      id: s.id,
      name: s.name,
      seq: s.seq,
      status: stageStatusLabel(s.status),
      progressPercent: s.progressPercent,
      financials: await computeStageFinancials(tx, s.id),
    });
  }
  return built;
}

function toProject(
  row: {
    id: string;
    projectCode: string;
    name: string;
    clientName: string;
    site: string;
    currentStageId: string | null;
  },
  builtStages: Stage[],
): Project {
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
  project.alerts = deriveProjectAlerts(getCurrentStage(project));
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
      result.push(toProject(row, await buildStages(tx, row.id)));
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
    return toProject(row, await buildStages(tx, row.id));
  });
}
