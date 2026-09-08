/**
 * `funding_request_lines` — the material / labour / fee / other breakdown of a
 * Funding Request (guidelines §18).
 *
 * In v1 these lines are entered **directly on the Funding Request** — the
 * separate Material Take-Off / Labour Agreement modules stay deferred
 * (multi-tenancy ticket 08 §2). They are the anchor for "what this stage was
 * scoped to cost": the projection's `remaining*` figures are
 * `Σ(these lines) − (what has since been committed/paid)`.
 *
 * Frozen when the parent is Issued (the parent's `document_snapshot` holds the
 * rendered copy); edited freely only while the parent is `draft`.
 *
 * RLS is applied by `app.enable_standard_rls('funding_request_lines')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { fundingRequests } from "./funding-requests";

export const fundingLineCategory = pgEnum("funding_line_category", [
  "material",
  "labour",
  "fee",
  "other",
]);

export const fundingRequestLines = pgTable(
  "funding_request_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    fundingRequestId: uuid("funding_request_id").notNull(),

    category: fundingLineCategory("category").notNull(),
    seq: integer("seq").notNull(),
    item: text("item").notNull(),
    description: text("description"),
    qty: numeric("qty", { precision: 14, scale: 3 }),
    unit: text("unit"),
    unitCost: bigint("unit_cost", { mode: "number" }),
    // The line total. Stored (not derived from qty × unitCost) so a lump-sum
    // line — "Assorted finishes: TZS 1,200,000" with no qty — is representable.
    amount: bigint("amount", { mode: "number" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("funding_request_lines_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "funding_request_lines_funding_request_id_account_id_fk",
      columns: [t.fundingRequestId, t.accountId],
      foreignColumns: [fundingRequests.id, fundingRequests.accountId],
    }).onDelete("cascade"),
  ],
);
