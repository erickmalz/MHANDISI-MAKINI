/**
 * `subcontractors` — the per-Account Subcontractor Register (guidelines §26,
 * §50). One subcontractor per Task (Phase 1 decision 05). Reused across the
 * Account's projects.
 *
 * RLS is applied by `app.enable_standard_rls('subcontractors')` in
 * the RLS block at the end of migration `0002_domain_structure`.
 */
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { partyStatus } from "./enums";

export const subcontractors = pgTable(
  "subcontractors",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    trade: text("trade"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    status: partyStatus("status").notNull().default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("subcontractors_id_account_id_key").on(t.id, t.accountId)],
);
