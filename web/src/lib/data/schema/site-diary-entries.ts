/**
 * `site_diary_entries` — a lightweight daily site record, one row per
 * Project + Stage + Date (guidelines §30, §50; Phase 4 ticket 01,
 * `.scratch/phase4/issues/01-site-diary.md`).
 *
 * Nothing is mandatory beyond `project_id` / `stage_id` / `entry_date` — a
 * supervisor filling this in from a phone at day's end can leave every
 * narrative field blank. Multiple entries per Stage per Date are allowed.
 * **Editable in place, not append-only**: this is explicitly a low-stakes
 * narrative record, not a financial one (ticket 01's Answer), so none of the
 * Phase 1-3 append-only/Issue discipline applies here — no `voided_at`, no
 * frozen snapshot. There is also no Stage Closeout gate tied to this table;
 * the diary stays purely informational.
 *
 * §30's "Photos" field is not a column here — it's `photos` rows
 * (`./photos.ts`) with `site_diary_entry_id` set, shown inline on the entry.
 * "Materials received" folds into `materials_used` as one free-text field
 * (ticket 01's Answer) rather than a separate structured line.
 *
 * `project_id` is denormalised alongside `stage_id` (both composite-FK'd
 * `(id, account_id)`, `ON DELETE CASCADE`) so a diary entry can be queried
 * project-wide without a join through `stages` — the DAL derives it from the
 * chosen stage at create time, never takes it from the caller.
 *
 * RLS is applied by `app.enable_standard_rls('site_diary_entries')` in the
 * hand-merged block at the end of this table's migration.
 */
import { sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { stages } from "./stages";

export const siteDiaryEntries = pgTable(
  "site_diary_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),
    stageId: uuid("stage_id").notNull(),

    entryDate: date("entry_date").notNull(),

    weather: text("weather"),
    workersOnSite: integer("workers_on_site"),
    activities: text("activities"),
    materialsUsed: text("materials_used"),
    equipmentUsed: text("equipment_used"),
    delays: text("delays"),
    issues: text("issues"),
    instructions: text("instructions"),
    visitors: text("visitors"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("site_diary_entries_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "site_diary_entries_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "site_diary_entries_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
  ],
);
