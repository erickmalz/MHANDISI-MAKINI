/**
 * `stage_templates` — the per-Account Stage Template register (Operational
 * Control decision 2, `.scratch/operational-control/map.md`), starting empty
 * like Suppliers/Subcontractors. A template stores **names and units only**
 * — no quantities, no prices, no costs — as one JSONB tree rather than a
 * relational Stage/Task/Material-Line trio: it is only ever read or written
 * wholesale (apply it to a new project, or overwrite it via "save as
 * template"), so normalising it would buy nothing. Applying a template
 * copies its names into real rows at project-creation time; there is no live
 * reference back, so editing a template never touches a project already
 * created from it.
 *
 * RLS is applied by `app.enable_standard_rls('stage_templates')` in
 * the RLS block at the end of migration `0007_stage_templates`.
 */
import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";

export type StageTemplateMaterialLine = {
  item: string;
  unit: string;
};

export type StageTemplateTask = {
  description: string;
  materialLines: StageTemplateMaterialLine[];
};

export type StageTemplateStage = {
  name: string;
  tasks: StageTemplateTask[];
};

export type StageTemplateBody = {
  stages: StageTemplateStage[];
};

export const stageTemplates = pgTable(
  "stage_templates",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    body: jsonb("body").$type<StageTemplateBody>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("stage_templates_id_account_id_key").on(t.id, t.accountId)],
);
