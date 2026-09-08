/**
 * `petty_cash_expenses` — an unplanned site cost paid from a project's Petty
 * Cash pool that does not fit an existing Purchase Order / Supplier Payment or
 * labour path (CONTEXT.md "Petty Cash Expense"; Phase 1 decision 09).
 *
 * Petty Cash is per-project (topped up from Material Variance savings and an
 * optional upfront client contribution) and counts inside Available Float, not
 * as a separate balance — so an expense here is a subtracted line in the
 * projection, attributed to a stage where known.
 *
 * `stage_id` is a **loose column** (no composite FK): the cascade path is
 * accounts → projects → petty_cash_expenses, and adding a second FK leg through
 * stages would make a diamond for no integrity gain (the DAL sets `stage_id`
 * from the project's own stages). Append-only with reversal.
 *
 * RLS is applied by `app.enable_standard_rls('petty_cash_expenses')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";

export const pettyCashExpenses = pgTable(
  "petty_cash_expenses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),
    stageId: uuid("stage_id"),

    description: text("description").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    spentOn: date("spent_on").notNull(),
    category: text("category"),
    receiptRef: text("receipt_ref"),

    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("petty_cash_expenses_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "petty_cash_expenses_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
  ],
);
