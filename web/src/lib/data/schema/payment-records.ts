/**
 * `payment_records` — a Supplier Payment against a Purchase Order, kept
 * separate from the delivery it settles (guidelines §22, §24; multi-tenancy
 * ticket 09 §3).
 *
 * Append-only with reversal (`voided_at` + `void_reason`, then a fresh record);
 * no negative amounts. `paid_total` and `derivePOStatus` ignore voided rows.
 *
 * A payment that takes the paid total past the ordered total is **soft-blocked**
 * in the DAL — allowed only with a typed `over_payment_reason` (guidelines
 * §42.6). `paid > ordered` floors the PO's commitment at 0 and shows as a
 * negative Outstanding (a supplier credit).
 *
 * RLS is applied by `app.enable_standard_rls('payment_records')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentMethod } from "./enums";
import { purchaseOrders } from "./purchase-orders";

export const supplierPaymentKind = pgEnum("supplier_payment_kind", [
  "deposit",
  "partial",
  "final",
]);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),

    paidOn: date("paid_on").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
    kind: supplierPaymentKind("kind"),
    overPaymentReason: text("over_payment_reason"),

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
    unique("payment_records_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "payment_records_purchase_order_id_account_id_fk",
      columns: [t.purchaseOrderId, t.accountId],
      foreignColumns: [purchaseOrders.id, purchaseOrders.accountId],
    }).onDelete("cascade"),
  ],
);
