/**
 * `delivery_records` (+ `delivery_record_lines`) — a material delivery against
 * a Purchase Order, kept separate from the payment that settles it (guidelines
 * §23; multi-tenancy ticket 09 §3).
 *
 * Append-only with reversal: a saved delivery is never edited — a correction is
 * `voided_at` + `void_reason` then a fresh record. Every derivation
 * (`derivePOStatus`, delivered/accepted quantities, Material Variance) ignores
 * voided rows. No negative quantities.
 *
 * A delivery that takes a line past its ordered quantity is allowed but
 * requires `over_delivery_reason` (guidelines §42.12); over-delivery is a
 * Material Variance reconciled at closeout, not a change to the PO's
 * commitment.
 *
 * RLS is applied by `app.enable_standard_rls(...)` for both tables in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { purchaseOrderLines } from "./purchase-order-lines";
import { purchaseOrders } from "./purchase-orders";

export const deliveryRecords = pgTable(
  "delivery_records",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),

    deliveredOn: date("delivered_on").notNull(),
    noteNumber: text("note_number"),
    siteNotes: text("site_notes"),
    overDeliveryReason: text("over_delivery_reason"),

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
    unique("delivery_records_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "delivery_records_purchase_order_id_account_id_fk",
      columns: [t.purchaseOrderId, t.accountId],
      foreignColumns: [purchaseOrders.id, purchaseOrders.accountId],
    }).onDelete("cascade"),
  ],
);

export const deliveryRecordLines = pgTable(
  "delivery_record_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    deliveryRecordId: uuid("delivery_record_id").notNull(),
    purchaseOrderLineId: uuid("purchase_order_line_id").notNull(),

    qtyDelivered: numeric("qty_delivered", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    qtyAccepted: numeric("qty_accepted", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    qtyRejected: numeric("qty_rejected", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("delivery_record_lines_id_account_id_key").on(t.id, t.accountId),
    // Diamond: a PO delete cascades to this row through BOTH the delivery
    // record and the PO line. Both legs CASCADE and agree, which Postgres
    // permits; the `delivery_record_id` leg is the "real" owner.
    foreignKey({
      name: "delivery_record_lines_delivery_record_id_account_id_fk",
      columns: [t.deliveryRecordId, t.accountId],
      foreignColumns: [deliveryRecords.id, deliveryRecords.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "delivery_record_lines_purchase_order_line_id_account_id_fk",
      columns: [t.purchaseOrderLineId, t.accountId],
      foreignColumns: [purchaseOrderLines.id, purchaseOrderLines.accountId],
    }).onDelete("cascade"),
  ],
);
