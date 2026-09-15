/**
 * The Site Diary domain — view-model types, no data access, safe to import
 * from client components (Phase 4 Slice 4.1, ticket 01).
 *
 * A diary entry is one row per Project + Stage + Date (guidelines §30, §50).
 * Nothing is mandatory beyond project/stage/date; every narrative field can
 * be left blank. Entries are editable in place — this is a low-stakes
 * narrative record, not a financial one, so no lifecycle/status is tracked
 * here (unlike Variation or Purchase Order).
 */

export interface SiteDiaryEntry {
  id: string;
  projectId: string;
  stageId: string;
  /** ISO calendar date (`YYYY-MM-DD`) — the day this entry is for. */
  entryDate: string;

  weather: string | null;
  workersOnSite: number | null;
  activities: string | null;
  /** Folds "Materials received" + "Major materials used" into one free-text field (ticket 01's Answer). */
  materialsUsed: string | null;
  equipmentUsed: string | null;
  delays: string | null;
  issues: string | null;
  instructions: string | null;
  visitors: string | null;
  notes: string | null;

  createdAt: string;
  updatedAt: string;
}
