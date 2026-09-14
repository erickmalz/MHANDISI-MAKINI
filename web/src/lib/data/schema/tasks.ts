/**
 * `tasks` — a unit of work within a Stage (guidelines §14, §50), normally
 * assigned to one Subcontractor (Phase 1 decision 05 — mixed-trade work is split
 * into separate Tasks, not multi-assigned).
 *
 * The labour agreement lives on the task (`labour_original` / `labour_revised`);
 * `retention_percent` is kept in the model but dormant at 0 (Phase 1 decision
 * 04 — retention isn't used, but the field is not removed). RLS is applied by
 * `app.enable_standard_rls('tasks')` in the RLS block at the end of migration `0002_domain_structure`.
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

import { stages } from "./stages";

export const taskStatus = pgEnum("task_status", [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `stages (id, account_id)` below (cascade path: accounts → projects →
    // stages → tasks).
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    // The assigned Subcontractor (one per task, Phase 1 decision 05). Left as a
    // loose column in Slice 2.1; the composite FK to `subcontractors
    // (id, account_id)` with `ON DELETE SET NULL (subcontractor_id)` lands with
    // the assignment UI in a later slice (a plain SET NULL would also null the
    // NOT NULL `account_id`).
    subcontractorId: uuid("subcontractor_id"),

    description: text("description").notNull(),
    seq: integer("seq").notNull(),
    labourOriginal: bigint("labour_original", { mode: "number" }),
    labourRevised: bigint("labour_revised", { mode: "number" }),
    retentionPercent: numeric("retention_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    progressPercent: integer("progress_percent").notNull().default(0),
    status: taskStatus("status").notNull().default("planned"),
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
    unique("tasks_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "tasks_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
  ],
);
