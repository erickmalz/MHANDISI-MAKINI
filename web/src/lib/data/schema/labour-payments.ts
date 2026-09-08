/**
 * `labour_payments` — money paid to a Task's Subcontractor against the labour
 * agreement stored on the Task (`tasks.labour_original` / `labour_revised`;
 * guidelines §27). In v1 there is no separate Labour Agreement table — the
 * agreement is Task columns (Phase 1 decision 05), and payments hang off the
 * Task.
 *
 * `Open Labour Commitments` (= Outstanding Labour) in the float formula is
 * `labour_revised − Σ(non-voided labour_payments) − retention released`, per
 * Task. Retention is dormant at 0 (Phase 1 decision 04) but
 * `is_retention_release` is kept so the release path exists when it is turned
 * on.
 *
 * Append-only with reversal (`voided_at` + `void_reason`); no negative amounts.
 *
 * RLS is applied by `app.enable_standard_rls('labour_payments')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentMethod } from "./enums";
import { tasks } from "./tasks";

export const labourPayments = pgTable(
  "labour_payments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    taskId: uuid("task_id").notNull(),

    amount: bigint("amount", { mode: "number" }).notNull(),
    paidOn: date("paid_on").notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    isRetentionRelease: boolean("is_retention_release").notNull().default(false),

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
    unique("labour_payments_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "labour_payments_task_id_account_id_fk",
      columns: [t.taskId, t.accountId],
      foreignColumns: [tasks.id, tasks.accountId],
    }).onDelete("cascade"),
  ],
);
