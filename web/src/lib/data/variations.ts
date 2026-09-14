import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { LinkedFundingRequest, Variation } from "@/lib/variations";
import type {
  ApproveVariationInput,
  VariationDraftInput,
} from "@/lib/validation/variations";

import { getCurrentAccountId } from "./account-context";
import { claimDocumentNumber, pad3 } from "./document-numbers";
import {
  additionalFundingRequestVariations,
  fundingRequests,
  materialLines,
  projects,
  stages,
  tasks,
  variations,
} from "./schema";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Variation DAL (Phase 3 ticket 01) — mirrors the Purchase Order / Funding
 * Request DALs' shape: no `accountId` in any signature, `withAccount` sets the
 * tenant GUC and Postgres RLS (`WITH CHECK`) is the backstop, so an insert
 * only ever writes the caller's own row and a cross-account update is a
 * silent no-op — callers read the returned-rows count and 404 / no-op.
 *
 * **Approve** is the atomic line between editable and immutable (ticket 01
 * §2/§3): it mints `VO-{project}-NNN`, revises the Task's `labour_revised` in
 * place (bypassing `stageBudgetLocked` — the one caller allowed to), and
 * *appends* a tagged `material_lines` row for the material impact. Reject and
 * Cancel never mint a number. A Variation is never deleted once Approved,
 * Rejected or Cancelled — only a Draft can be discarded.
 */

const iso = (v: Date | string | null): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : v;

// --- View-model assembly -------------------------------------------------

const variationSelection = {
  id: variations.id,
  stageId: variations.stageId,
  stageName: stages.name,
  projectId: stages.projectId,
  taskId: variations.taskId,
  taskDescription: tasks.description,
  status: variations.status,
  baseNumber: variations.baseNumber,
  displayNumber: variations.displayNumber,
  description: variations.description,
  reason: variations.reason,
  materialImpact: variations.materialImpact,
  labourImpact: variations.labourImpact,
  feeImpact: variations.feeImpact,
  requestedAt: variations.requestedAt,
  approvedAt: variations.approvedAt,
  clientReference: variations.clientReference,
  notes: variations.notes,
  rejectedAt: variations.rejectedAt,
  cancelledAt: variations.cancelledAt,
} as const;

type VariationRow = {
  id: string;
  stageId: string;
  stageName: string;
  projectId: string;
  taskId: string;
  taskDescription: string;
  status: Variation["status"];
  baseNumber: number | null;
  displayNumber: string | null;
  description: string;
  reason: string | null;
  materialImpact: number | null;
  labourImpact: number | null;
  feeImpact: number | null;
  requestedAt: Date | string;
  approvedAt: string | null;
  clientReference: string | null;
  notes: string | null;
  rejectedAt: Date | string | null;
  cancelledAt: Date | string | null;
};

async function assemble(
  tx: AccountTx,
  rows: VariationRow[],
): Promise<Variation[]> {
  if (rows.length === 0) return [];
  const variationIds = rows.map((r) => r.id);

  const linkRows = await tx
    .select({
      variationId: additionalFundingRequestVariations.variationId,
      fundingRequestId: fundingRequests.id,
      displayNumber: fundingRequests.displayNumber,
      status: fundingRequests.status,
    })
    .from(additionalFundingRequestVariations)
    .innerJoin(
      fundingRequests,
      eq(fundingRequests.id, additionalFundingRequestVariations.fundingRequestId),
    )
    .where(inArray(additionalFundingRequestVariations.variationId, variationIds));

  const linksByVariation = new Map<string, LinkedFundingRequest[]>();
  for (const l of linkRows) {
    const list = linksByVariation.get(l.variationId) ?? [];
    list.push({ id: l.fundingRequestId, displayNumber: l.displayNumber, status: l.status });
    linksByVariation.set(l.variationId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    stageId: r.stageId,
    stageName: r.stageName,
    projectId: r.projectId,
    taskId: r.taskId,
    taskDescription: r.taskDescription,
    status: r.status,
    baseNumber: r.baseNumber,
    displayNumber: r.displayNumber,
    description: r.description,
    reason: r.reason,
    materialImpact: r.materialImpact,
    labourImpact: r.labourImpact,
    feeImpact: r.feeImpact,
    requestedAt: iso(r.requestedAt) as string,
    approvedAt: r.approvedAt,
    clientReference: r.clientReference,
    notes: r.notes,
    rejectedAt: iso(r.rejectedAt),
    cancelledAt: iso(r.cancelledAt),
    fundingRequestLinks: linksByVariation.get(r.id) ?? [],
  }));
}

/** Every Variation against a stage, oldest first. */
export async function listVariationsForStage(stageId: string): Promise<Variation[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(variationSelection)
      .from(variations)
      .innerJoin(stages, eq(stages.id, variations.stageId))
      .innerJoin(tasks, eq(tasks.id, variations.taskId))
      .where(eq(variations.stageId, stageId))
      .orderBy(asc(variations.requestedAt))) as VariationRow[];
    return assemble(tx, rows);
  });
}

/** One Variation by opaque id, or `null` (missing or cross-account). */
export async function getVariation(variationId: string): Promise<Variation | null> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(variationSelection)
      .from(variations)
      .innerJoin(stages, eq(stages.id, variations.stageId))
      .innerJoin(tasks, eq(tasks.id, variations.taskId))
      .where(eq(variations.id, variationId))
      .limit(1)) as VariationRow[];
    const [v] = await assemble(tx, rows);
    return v ?? null;
  });
}

// --- Draft create / edit -------------------------------------------------

/** Assert `taskId` is a live task belonging to `stageId` in the caller's Account. */
async function taskBelongsToStage(
  tx: AccountTx,
  taskId: string,
  stageId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.stageId, stageId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Create a Draft Variation under a stage, against one of its Tasks. Returns the
 * new id, or `null` when the stage is missing / cross-account or the chosen
 * task does not belong to that stage.
 */
export async function createVariationDraft(
  stageId: string,
  input: VariationDraftInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;
    if (!(await taskBelongsToStage(tx, input.taskId, stageId))) return null;

    const [row] = await tx
      .insert(variations)
      .values({
        accountId,
        stageId,
        taskId: input.taskId,
        status: "draft",
        description: input.description,
        reason: input.reason ?? null,
        materialImpact: input.materialImpact ?? null,
        labourImpact: input.labourImpact ?? null,
        feeImpact: input.feeImpact ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: variations.id });
    return row.id;
  });
}

/** The editable body of a Draft, form-shaped, or `null` (missing / not a draft). */
export async function getVariationDraftInput(variationId: string): Promise<
  | (VariationDraftInput & {
      projectId: string;
      stageId: string;
      stageName: string;
      taskDescription: string;
    })
  | null
> {
  return withAccount(async (tx) => {
    const [row] = (await tx
      .select({
        id: variations.id,
        status: variations.status,
        stageId: variations.stageId,
        stageName: stages.name,
        projectId: stages.projectId,
        taskId: variations.taskId,
        taskDescription: tasks.description,
        description: variations.description,
        reason: variations.reason,
        materialImpact: variations.materialImpact,
        labourImpact: variations.labourImpact,
        feeImpact: variations.feeImpact,
        notes: variations.notes,
      })
      .from(variations)
      .innerJoin(stages, eq(stages.id, variations.stageId))
      .innerJoin(tasks, eq(tasks.id, variations.taskId))
      .where(eq(variations.id, variationId))
      .limit(1)) as {
      id: string;
      status: Variation["status"];
      stageId: string;
      stageName: string;
      projectId: string;
      taskId: string;
      taskDescription: string;
      description: string;
      reason: string | null;
      materialImpact: number | null;
      labourImpact: number | null;
      feeImpact: number | null;
      notes: string | null;
    }[];
    if (!row || row.status !== "draft") return null;

    return {
      projectId: row.projectId,
      stageId: row.stageId,
      stageName: row.stageName,
      taskId: row.taskId,
      taskDescription: row.taskDescription,
      description: row.description,
      reason: row.reason ?? undefined,
      materialImpact: row.materialImpact ?? undefined,
      labourImpact: row.labourImpact ?? undefined,
      feeImpact: row.feeImpact ?? undefined,
      notes: row.notes ?? undefined,
    };
  });
}

/**
 * Replace a Draft's body. `false` when the id is missing, cross-account, no
 * longer a draft, or the chosen task does not belong to the Variation's stage.
 */
export async function updateVariationDraft(
  variationId: string,
  input: VariationDraftInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ status: variations.status, stageId: variations.stageId })
      .from(variations)
      .where(eq(variations.id, variationId))
      .limit(1);
    if (!row || row.status !== "draft") return false;
    if (!(await taskBelongsToStage(tx, input.taskId, row.stageId))) return false;

    const res = await tx
      .update(variations)
      .set({
        taskId: input.taskId,
        description: input.description,
        reason: input.reason ?? null,
        materialImpact: input.materialImpact ?? null,
        labourImpact: input.labourImpact ?? null,
        feeImpact: input.feeImpact ?? null,
        notes: input.notes ?? null,
      })
      .where(eq(variations.id, variationId))
      .returning({ id: variations.id });
    return res.length > 0;
  });
}

/** Discard a Draft. `false` when missing / not a draft. */
export async function deleteVariationDraft(variationId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(variations)
      .where(and(eq(variations.id, variationId), eq(variations.status, "draft")))
      .returning({ id: variations.id });
    return res.length > 0;
  });
}

// --- Approve ---------------------------------------------------------

export type ApproveVariationResult =
  | { ok: true; displayNumber: string }
  | { ok: false; reason: "not-found" | "not-draft" };

/**
 * The atomic Approve transaction (ticket 01 §2/§3). Mints `VO-{project}-NNN`,
 * revises the Task's `labour_revised` in place for the labour impact (the one
 * caller allowed to bypass `stageBudgetLocked`), and appends a tagged
 * `material_lines` row for the material impact — never touching the Task's
 * `labour_original` or any existing take-off line. `fee_impact` is carried as
 * a note only (ticket 01 §5) — no Fee Invoice is raised here.
 */
export async function approveVariation(
  variationId: string,
  input: ApproveVariationInput,
): Promise<ApproveVariationResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [v] = (await tx
      .select({
        id: variations.id,
        status: variations.status,
        taskId: variations.taskId,
        description: variations.description,
        reason: variations.reason,
        materialImpact: variations.materialImpact,
        labourImpact: variations.labourImpact,
        projectId: stages.projectId,
        projectCode: projects.projectCode,
      })
      .from(variations)
      .innerJoin(stages, eq(stages.id, variations.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(variations.id, variationId))
      .limit(1)) as {
      id: string;
      status: Variation["status"];
      taskId: string;
      description: string;
      reason: string | null;
      materialImpact: number | null;
      labourImpact: number | null;
      projectId: string;
      projectCode: string;
    }[];

    if (!v) return { ok: false as const, reason: "not-found" as const };
    if (v.status !== "draft") return { ok: false as const, reason: "not-draft" as const };

    const base = await claimDocumentNumber(tx, accountId, v.projectId, "variation");
    const displayNumber = `VO-${v.projectCode}-${pad3(base)}`;
    const approvedOn = input.approvedAt ?? new Date().toISOString().slice(0, 10);

    // Labour impact: revise `labour_revised` in place, bypassing
    // `stageBudgetLocked` — this is the one sanctioned caller (ticket 01 §3).
    // `labour_original` is never touched.
    if (v.labourImpact != null && v.labourImpact !== 0) {
      await tx.execute(sql`
        UPDATE tasks
        SET labour_revised = COALESCE(labour_revised, labour_original, 0) + ${v.labourImpact},
            updated_at = now()
        WHERE id = ${v.taskId}
      `);
    }

    // Material impact: append one tagged take-off line rather than editing an
    // existing one (ticket 01 §3) — a single lump-sum line, since a Variation
    // carries one signed monetary figure, not an itemised breakdown.
    if (v.materialImpact != null && v.materialImpact !== 0) {
      await tx.insert(materialLines).values({
        accountId,
        taskId: v.taskId,
        variationId: v.id,
        item: `Variation ${displayNumber}`,
        description: v.reason ?? v.description,
        qtyOriginal: "1",
        unit: "lot",
        estUnitCostOriginal: v.materialImpact,
      });
    }

    await tx
      .update(variations)
      .set({
        status: "approved",
        baseNumber: base,
        displayNumber,
        approvedAt: approvedOn,
        clientReference: input.clientReference ?? null,
      })
      .where(eq(variations.id, variationId));

    return { ok: true as const, displayNumber };
  });
}

// --- Reject / Cancel ---------------------------------------------------

/** Reject a Draft — never numbered (ticket 01 §2). `false` when missing / not a draft. */
export async function rejectVariation(variationId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(variations)
      .set({ status: "rejected", rejectedAt: new Date() })
      .where(and(eq(variations.id, variationId), eq(variations.status, "draft")))
      .returning({ id: variations.id });
    return res.length > 0;
  });
}

/**
 * Cancel a Draft or an Approved Variation — the terminal off-ramp for a scope
 * change abandoned before it's acted on further (ticket 01 §1). `false` when
 * missing or already Rejected/Cancelled.
 */
export async function cancelVariation(variationId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(variations)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(variations.id, variationId),
          inArray(variations.status, ["draft", "approved"]),
        ),
      )
      .returning({ id: variations.id });
    return res.length > 0;
  });
}

// --- Additional Funding Request linkage (ticket 01 §4) -------------------

/**
 * Manually link one or more Approved Variations to an Additional Funding
 * Request the Engineer is raising for them — purely informational, no
 * computation depends on it. Approving a Variation never calls this itself;
 * it is invoked by the Funding Request create action when `variationIds` are
 * passed through. Only `approved` Variations are linked; anything else in the
 * list is silently skipped (defensive — the UI only offers Approved,
 * not-yet-linked Variations).
 */
export async function linkVariationsToFundingRequest(
  fundingRequestId: string,
  variationIds: string[],
): Promise<void> {
  if (variationIds.length === 0) return;
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [fr] = await tx
      .select({ id: fundingRequests.id })
      .from(fundingRequests)
      .where(eq(fundingRequests.id, fundingRequestId))
      .limit(1);
    if (!fr) return;

    const approvedRows = await tx
      .select({ id: variations.id })
      .from(variations)
      .where(
        and(inArray(variations.id, variationIds), eq(variations.status, "approved")),
      );
    if (approvedRows.length === 0) return;

    await tx
      .insert(additionalFundingRequestVariations)
      .values(
        approvedRows.map((v) => ({
          accountId,
          fundingRequestId,
          variationId: v.id,
        })),
      )
      .onConflictDoNothing();
  });
}
