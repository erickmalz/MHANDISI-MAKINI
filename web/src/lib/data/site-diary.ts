import "server-only";

import { desc, eq } from "drizzle-orm";

import type { SiteDiaryEntry } from "@/lib/site-diary";
import type { SiteDiaryEntryInput } from "@/lib/validation/site-diary";

import { getCurrentAccountId } from "./account-context";
import { siteDiaryEntries, stages } from "./schema";
import { withAccount } from "./with-account";

/**
 * The Site Diary DAL (Phase 4 Slice 4.1, ticket 01). Mirrors the Variation
 * DAL's shape: no `accountId` in any signature, `withAccount` sets the
 * tenant GUC and Postgres RLS is the backstop.
 *
 * Entries are **editable in place and deletable** — this is a low-stakes
 * narrative record, not a financial one, so none of the append-only/Issue
 * discipline used elsewhere in this schema applies (ticket 01's Answer).
 * There is no Stage Closeout gate here either — the diary stays purely
 * informational.
 */

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : v);

const selection = {
  id: siteDiaryEntries.id,
  projectId: siteDiaryEntries.projectId,
  stageId: siteDiaryEntries.stageId,
  entryDate: siteDiaryEntries.entryDate,
  weather: siteDiaryEntries.weather,
  workersOnSite: siteDiaryEntries.workersOnSite,
  activities: siteDiaryEntries.activities,
  materialsUsed: siteDiaryEntries.materialsUsed,
  equipmentUsed: siteDiaryEntries.equipmentUsed,
  delays: siteDiaryEntries.delays,
  issues: siteDiaryEntries.issues,
  instructions: siteDiaryEntries.instructions,
  visitors: siteDiaryEntries.visitors,
  notes: siteDiaryEntries.notes,
  createdAt: siteDiaryEntries.createdAt,
  updatedAt: siteDiaryEntries.updatedAt,
} as const;

type EntryRow = {
  id: string;
  projectId: string;
  stageId: string;
  entryDate: string;
  weather: string | null;
  workersOnSite: number | null;
  activities: string | null;
  materialsUsed: string | null;
  equipmentUsed: string | null;
  delays: string | null;
  issues: string | null;
  instructions: string | null;
  visitors: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toViewModel(r: EntryRow): SiteDiaryEntry {
  return {
    id: r.id,
    projectId: r.projectId,
    stageId: r.stageId,
    entryDate: r.entryDate,
    weather: r.weather,
    workersOnSite: r.workersOnSite,
    activities: r.activities,
    materialsUsed: r.materialsUsed,
    equipmentUsed: r.equipmentUsed,
    delays: r.delays,
    issues: r.issues,
    instructions: r.instructions,
    visitors: r.visitors,
    notes: r.notes,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

/** Every diary entry for a Stage, most recent date first. */
export async function listSiteDiaryEntries(stageId: string): Promise<SiteDiaryEntry[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(selection)
      .from(siteDiaryEntries)
      .where(eq(siteDiaryEntries.stageId, stageId))
      .orderBy(
        desc(siteDiaryEntries.entryDate),
        desc(siteDiaryEntries.createdAt),
      )) as EntryRow[];
    return rows.map(toViewModel);
  });
}

/** One diary entry by opaque id, or `null` (missing or cross-account). */
export async function getSiteDiaryEntry(entryId: string): Promise<SiteDiaryEntry | null> {
  return withAccount(async (tx) => {
    const [row] = (await tx
      .select(selection)
      .from(siteDiaryEntries)
      .where(eq(siteDiaryEntries.id, entryId))
      .limit(1)) as EntryRow[];
    return row ? toViewModel(row) : null;
  });
}

/**
 * Create an entry under a Stage. Returns the new id, or `null` when the
 * stage is missing / cross-account. `projectId` is derived from the chosen
 * stage, never taken from the caller.
 */
export async function createSiteDiaryEntry(
  stageId: string,
  input: SiteDiaryEntryInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id, projectId: stages.projectId })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;

    const [row] = await tx
      .insert(siteDiaryEntries)
      .values({
        accountId,
        projectId: stage.projectId,
        stageId,
        entryDate: input.entryDate,
        weather: input.weather ?? null,
        workersOnSite: input.workersOnSite ?? null,
        activities: input.activities ?? null,
        materialsUsed: input.materialsUsed ?? null,
        equipmentUsed: input.equipmentUsed ?? null,
        delays: input.delays ?? null,
        issues: input.issues ?? null,
        instructions: input.instructions ?? null,
        visitors: input.visitors ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: siteDiaryEntries.id });
    return row.id;
  });
}

/** Replace an entry's body in place. `false` when missing / cross-account. */
export async function updateSiteDiaryEntry(
  entryId: string,
  input: SiteDiaryEntryInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(siteDiaryEntries)
      .set({
        entryDate: input.entryDate,
        weather: input.weather ?? null,
        workersOnSite: input.workersOnSite ?? null,
        activities: input.activities ?? null,
        materialsUsed: input.materialsUsed ?? null,
        equipmentUsed: input.equipmentUsed ?? null,
        delays: input.delays ?? null,
        issues: input.issues ?? null,
        instructions: input.instructions ?? null,
        visitors: input.visitors ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(siteDiaryEntries.id, entryId))
      .returning({ id: siteDiaryEntries.id });
    return res.length > 0;
  });
}

/**
 * Discard an entry outright. A low-stakes narrative record with no
 * downstream financial effect, so (unlike a Variation or Purchase Order) a
 * plain delete is safe — no cancellation/void state is needed.
 */
export async function deleteSiteDiaryEntry(entryId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(siteDiaryEntries)
      .where(eq(siteDiaryEntries.id, entryId))
      .returning({ id: siteDiaryEntries.id });
    return res.length > 0;
  });
}
