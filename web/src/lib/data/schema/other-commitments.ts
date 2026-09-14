/**
 * `other_commitments` — "Other Approved Project Commitments" (guidelines §6.1;
 * CONTEXT.md "Available Float"). An approved project cost for the stage that is
 * neither a Purchase Order, a labour payment, nor a petty-cash expense — e.g. a
 * council fee, a hired plant charge, a professional service.
 *
 * It reduces Available Float from the moment it is approved (like a Purchase
 * Order does). `paid_amount` tracks settlement for reporting; the float
 * subtraction is the full `amount` while it is live. Append-only with reversal.
 *
 * RLS is applied by `app.enable_standard_rls('other_commitments')` in the
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

import { stages } from "./stages";

export const otherCommitments = pgTable(
  "other_commitments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),

    description: text("description").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    paidAmount: bigint("paid_amount", { mode: "number" }).notNull().default(0),
    approvedOn: date("approved_on").notNull(),
    notes: text("notes"),

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
    unique("other_commitments_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "other_commitments_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
  ],
);
