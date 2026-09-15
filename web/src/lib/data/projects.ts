import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { getCurrentStage, stageStatusLabel } from "@/lib/project-view";
import type { Project, Stage } from "@/lib/types";

import { computeStageAlerts, deriveProjectAlerts } from "./alerts";
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
 * shows up here as reporting headroom, not a posted ledger event. One SQL
 * aggregate rather than looping `computeStageFinancials` per stage.
 *
 * `tx`-scoped so a caller already inside its own transaction (Phase 4 Slice
 * 4.2's `closeStage`, freezing this same figure into the Stage Closeout
 * Report snapshot) can call it directly, same posture as
 * `computeStageFinancials` — avoids nesting a second `withAccount`/
 * `db.transaction()` inside the caller's own.
 */
export async function accumulatedMaterialVarianceTx(
  tx: AccountTx,
  projectId: string,
): Promise<number> {
  const row = (
    await tx.execute<{ material_estimated: string; paid_purchases: string }>(sql`
        SELECT
          COALESCE((
            SELECT SUM(
              CASE
                WHEN ml.qty_revised IS NOT NULL OR ml.est_unit_cost_revised IS NOT NULL
                  THEN COALESCE(ml.qty_revised, ml.qty_original, 0)
                       * COALESCE(ml.est_unit_cost_revised, ml.est_unit_cost_original, 0)
                ELSE COALESCE(ml.qty_original, 0) * COALESCE(ml.est_unit_cost_original, 0)
              END
            )
            FROM material_lines ml
            JOIN tasks t ON t.id = ml.task_id
            JOIN stages s ON s.id = t.stage_id
            WHERE s.project_id = ${projectId}
          ), 0) AS material_estimated,
          COALESCE((
            SELECT SUM(p.amount)
            FROM payment_records p
            JOIN purchase_orders po ON po.id = p.purchase_order_id
            JOIN stages s ON s.id = po.stage_id
            WHERE s.project_id = ${projectId}
              AND po.status IN ('ordered', 'closed')
              AND p.voided_at IS NULL
          ), 0) AS paid_purchases
      `)
  ).rows[0];
  return Number(row?.material_estimated ?? 0) - Number(row?.paid_purchases ?? 0);
}

/** `withAccount`-wrapped read for screens — wraps `accumulatedMaterialVarianceTx`. */
export async function getAccumulatedMaterialVariance(
  projectId: string,
): Promise<number> {
  return withAccount((tx) => accumulatedMaterialVarianceTx(tx, projectId));
}
