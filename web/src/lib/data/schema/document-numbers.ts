/**
 * `document_number_sequences` — the per-project, per-type counter behind the
 * human-facing document numbers (multi-tenancy ticket 09 §5, ticket 10 §8).
 *
 * One row per (project, type). The Issue transaction does
 * `UPDATE ... SET next_value = next_value + 1 RETURNING next_value - 1`
 * (creating the row at 1 on first use), so numbers are gap-free per project and
 * never reused. The formatted string (`FR-{project_code}-{008}`) is frozen onto
 * the issued record itself — this table only holds the counter.
 *
 * RLS is applied by `app.enable_standard_rls('document_number_sequences')` in
 * the hand-merged block at the end of migration `0003_money_tables`.
 */
import {
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

import { documentNumberType } from "./enums";
import { projects } from "./projects";

export const documentNumberSequences = pgTable(
  "document_number_sequences",
  {
    // Denormalised tenant key — integrity runs through the composite FK to
    // `projects (id, account_id)` below.
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),
    type: documentNumberType("type").notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.type] }),
    foreignKey({
      name: "document_number_sequences_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
  ],
);
