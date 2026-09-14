/**
 * `purchase_order_lines` — the material lines of a Purchase Order (guidelines
 * §22). Editable while the parent is `planned`; frozen when it is Issued.
 *
 * Delivered / accepted / rejected quantities are NOT columns here — they are
 * summed from `delivery_record_lines` per line (Ordered ≠ Delivered ≠ Paid,
 * guidelines §23).
 *
 * RLS is applied by `app.enable_standard_rls('purchase_order_lines')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { purchaseOrders } from "./purchase-orders";

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),

    seq: integer("seq").notNull(),
    item: text("item").notNull(),
    description: text("description"),
    unit: text("unit").notNull(),
    qtyOrdered: numeric("qty_ordered", { precision: 14, scale: 3 }).notNull(),
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("purchase_order_lines_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "purchase_order_lines_purchase_order_id_account_id_fk",
      columns: [t.purchaseOrderId, t.accountId],
      foreignColumns: [purchaseOrders.id, purchaseOrders.accountId],
    }).onDelete("cascade"),
  ],
);
