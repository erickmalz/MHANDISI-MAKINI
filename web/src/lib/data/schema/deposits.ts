/**
 * `deposits` — client money actually received against a Funding Request
 * (guidelines §20; CONTEXT.md "Deposit"). Always 100% project funds — the fee
 * is never split out of a deposit, it is billed through the Fee Invoice.
 *
 * Multiple deposits per Funding Request are allowed (§20). Deposits recorded
 * against a version that is later superseded still count toward the stage and
 * toward the new version's progress (ticket 09 §1) — the projection sums
 * deposits by stage, through whichever Funding Request version they name.
 *
 * Append-only with reversal: a wrong deposit is voided (`voided_at` +
 * `void_reason`), never edited, then re-entered. Every projection ignores
 * voided rows.
 *
 * RLS is applied by `app.enable_standard_rls('deposits')` in the hand-merged
 * block at the end of migration `0003_money_tables`.
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

import { paymentMethod } from "./enums";
import { fundingRequests } from "./funding-requests";

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    fundingRequestId: uuid("funding_request_id").notNull(),

    amount: bigint("amount", { mode: "number" }).notNull(),
    receivedOn: date("received_on").notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
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
    unique("deposits_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "deposits_funding_request_id_account_id_fk",
      columns: [t.fundingRequestId, t.accountId],
      foreignColumns: [fundingRequests.id, fundingRequests.accountId],
    }).onDelete("cascade"),
  ],
);
