/**
 * `purchase_orders` — a formal commitment to a Supplier for material lines
 * (guidelines §22; CONTEXT.md "Purchase Order", "Commitment State"). State
 * machine fixed by multi-tenancy ticket 09 §2.
 *
 * `status` holds only the **stored** lifecycle bits — `planned → ordered`, plus
 * the terminal `cancelled` / `closed`. The sub-states `partially_delivered`,
 * `delivered`, `partially_paid`, `paid` are **derived** from the child records
 * by `derivePOStatus` and are never written here.
 *
 * **Issue** ("Issue purchase order" = `planned → ordered`) is the atomic line
 * between editable and immutable: it assigns `base_number` / `display_number`,
 * freezes `document_snapshot`, sets `ordered_at`, and the ordered total begins
 * counting against Available Float. After `ordered` the only writes are
 * *appending* Delivery / Payment records or `cancel`; a real change is
 * cancel-and-reissue (ADR 0003) — POs have no version chain.
 *
 * `reopened_at` records a post-`closed` reopen, available until the stage is
 * closed out (guidelines §42.14).
 *
 * RLS is applied by `app.enable_standard_rls('purchase_orders')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { DocumentSnapshot } from "./snapshot";
import { stages } from "./stages";

export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "planned",
  "ordered",
  "cancelled",
  "closed",
]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `stages (id, account_id)` below (cascade path: accounts → projects →
    // stages → purchase_orders).
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    // The Supplier from the per-Account register. A **loose column**, not a
    // composite FK — the same call 2.1 made for `tasks.subcontractor_id`: a
    // register row must be deletable without a cascade that would either nuke
    // the PO's financial history or null the NOT NULL `account_id`. The
    // supplier's identity is frozen into `document_snapshot` at Issue, so a
    // later broken link loses only the register cross-reference. The DAL
    // validates this points at a live supplier in the same account.
    supplierId: uuid("supplier_id"),

    status: purchaseOrderStatus("status").notNull().default("planned"),

    baseNumber: integer("base_number"),
    displayNumber: text("display_number"),

    expectedDeliveryOn: date("expected_delivery_on"),
    // Copied from the supplier register at draft; frozen at Issue.
    paymentTerms: text("payment_terms"),
    notes: text("notes"),

    // A supplier's acknowledgement of the order — an optional dated note, not a
    // lifecycle gate (ticket 09 §2: "Confirmed" is dropped as a state).
    supplierAckNote: text("supplier_ack_note"),
    supplierAckOn: date("supplier_ack_on"),

    cancelReason: text("cancel_reason"),

    // Frozen at Issue; null while `planned`.
    documentSnapshot: jsonb("document_snapshot").$type<DocumentSnapshot>(),

    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("purchase_orders_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "purchase_orders_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
  ],
);
