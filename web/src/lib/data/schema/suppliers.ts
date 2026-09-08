/**
 * `suppliers` — the per-Account Supplier Register (guidelines §25, §50). Reused
 * across the Account's projects; a Purchase Order names a supplier from here.
 *
 * RLS is applied by `app.enable_standard_rls('suppliers')` in
 * the RLS block at the end of migration `0002_domain_structure`.
 */
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { partyStatus } from "./enums";

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: text("phone"),
    email: text("email"),
    location: text("location"),
    paymentTerms: text("payment_terms"),
    notes: text("notes"),
    status: partyStatus("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("suppliers_id_account_id_key").on(t.id, t.accountId)],
);
