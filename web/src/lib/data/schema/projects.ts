/**
 * `projects` — the top of the work hierarchy (guidelines §12, §50).
 *
 * Every domain table from Phase 2 on carries its own `account_id` (multi-tenancy
 * ticket 06): RLS evaluates a per-table predicate and does not re-check through
 * foreign keys, so the tenant key is denormalised all the way down and kept
 * honest with composite FKs — `UNIQUE (id, account_id)` on the parent, and each
 * child FK references `(id, account_id)`.
 *
 * RLS (ENABLE + FORCE + the standard `account_isolation` policy) is applied by
 * `app.enable_standard_rls('projects')` in the hand-merged block at the end of
 * migration `0002_domain_structure` — not here (drizzle-kit does not track RLS).
 */
import { sql } from "drizzle-orm";
import {
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";

/**
 * How the client's material estimate is treated (Phase 1 decision 01).
 * `budget` — the client pays actual material cost; the client owns Material
 * Variance, and a saving is credited to the project's Petty Cash pool.
 * `fixed_price` — a future arrangement where the client pays the estimated
 * amount regardless of actual cost. Per-project, defaulting to `budget`.
 */
export const estimateModel = pgEnum("estimate_model", ["budget", "fixed_price"]);

export const projectStatus = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    projectCode: text("project_code").notNull(),
    name: text("name").notNull(),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone"),
    clientEmail: text("client_email"),
    site: text("site").notNull(),
    currency: text("currency").notNull().default("TZS"),
    estimateModel: estimateModel("estimate_model").notNull().default("budget"),

    // The one open stage the engineer is working (one project at a time, one
    // stage at a time). Stored and editable; nullable until the first stage
    // exists. Left as a loose column in Slice 2.1 — the composite FK to
    // `stages (id, account_id)` lands with the DAL that maintains it (declaring
    // it here would also make projects ⇄ stages a circular module import).
    currentStageId: uuid("current_stage_id"),

    status: projectStatus("status").notNull().default("active"),
    startedOn: date("started_on"),
    expectedCompletionOn: date("expected_completion_on"),
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
    unique("projects_id_account_id_key").on(t.id, t.accountId),
    unique("projects_account_id_project_code_key").on(
      t.accountId,
      t.projectCode,
    ),
  ],
);
