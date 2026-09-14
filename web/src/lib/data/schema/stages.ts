/**
 * `stages` — a sequential phase of a Project (guidelines §13, §50). Only one
 * stage is normally active at a time.
 *
 * The fee basis / amount / percent are set per stage with no fixed global rule
 * (Phase 1 map: "Fee basis defaults" is not a ticket). RLS is applied by
 * `app.enable_standard_rls('stages')` in the RLS block at the end of migration `0002_domain_structure`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const stageStatus = pgEnum("stage_status", [
  "planned",
  "active",
  "awaiting_funding",
  "on_hold",
  "ready_for_closeout",
  "completed",
  "cancelled",
]);

export const feeBasis = pgEnum("fee_basis", ["fixed", "percent"]);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key. Its referential integrity to `accounts` runs
    // through the composite FK to `projects (id, account_id)` below — a child
    // table has one cascade path (accounts → projects → stages), never a second
    // direct one.
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),

    name: text("name").notNull(),
    seq: integer("seq").notNull(),
    feeBasis: feeBasis("fee_basis"),
    feeAmount: bigint("fee_amount", { mode: "number" }),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 }),
    progressPercent: integer("progress_percent").notNull().default(0),
    status: stageStatus("status").notNull().default("planned"),
    startedOn: date("started_on"),
    completedOn: date("completed_on"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("stages_id_account_id_key").on(t.id, t.accountId),
    unique("stages_project_id_seq_key").on(t.projectId, t.seq),
    foreignKey({
      name: "stages_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
  ],
);
