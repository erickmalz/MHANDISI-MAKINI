/**
 * `attachments` — one proof file (a supplier invoice/receipt PDF or photo)
 * attached to a Purchase Order, a Payment, or a Labour Payment (Operational
 * Control decision 1, `.scratch/operational-control/map.md`). Raw bytes in
 * Postgres (`bytea`), same call as `accounts.logo` — no S3/blob/CDN in this
 * self-hosted, single-container app (ADR 0001).
 *
 * Polymorphic by having three nullable FK columns rather than a loose
 * `entity_type`/`entity_id` pair: each target already gets the standard
 * composite-FK treatment (`(target_id, account_id)` → `target(id, account_id)`,
 * `ON DELETE CASCADE` — an attachment has no life of its own once the record
 * it proves is gone). Exactly one of the three is set per row; the DAL
 * enforces that (no DB `CHECK`, matching how this schema enforces every other
 * cross-column business rule — e.g. `over_payment_reason`). A `UNIQUE`
 * constraint on each FK column caps it at one attachment per record (`UNIQUE`
 * ignores `NULL`s, so this costs nothing on the two columns that don't apply).
 *
 * RLS is applied by `app.enable_standard_rls('attachments')` in the
 * hand-merged block at the end of this table's migration.
 */
import { sql } from "drizzle-orm";
import {
  customType,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { labourPayments } from "./labour-payments";
import { paymentRecords } from "./payment-records";
import { purchaseOrders } from "./purchase-orders";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),

    purchaseOrderId: uuid("purchase_order_id"),
    paymentRecordId: uuid("payment_record_id"),
    labourPaymentId: uuid("labour_payment_id"),

    file: bytea("file").notNull(),
    contentType: text("content_type").notNull(),
    filename: text("filename").notNull(),
    caption: text("caption"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("attachments_id_account_id_key").on(t.id, t.accountId),
    unique("attachments_purchase_order_id_key").on(t.purchaseOrderId),
    unique("attachments_payment_record_id_key").on(t.paymentRecordId),
    unique("attachments_labour_payment_id_key").on(t.labourPaymentId),
    foreignKey({
      name: "attachments_purchase_order_id_account_id_fk",
      columns: [t.purchaseOrderId, t.accountId],
      foreignColumns: [purchaseOrders.id, purchaseOrders.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "attachments_payment_record_id_account_id_fk",
      columns: [t.paymentRecordId, t.accountId],
      foreignColumns: [paymentRecords.id, paymentRecords.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "attachments_labour_payment_id_account_id_fk",
      columns: [t.labourPaymentId, t.accountId],
      foreignColumns: [labourPayments.id, labourPayments.accountId],
    }).onDelete("cascade"),
  ],
);
