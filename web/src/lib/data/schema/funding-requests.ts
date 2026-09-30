/**
 * `funding_requests` — a formal, versioned ask to the client for one stage's
 * money (guidelines §18, §19; CONTEXT.md "Funding Request"). The state machine
 * is fixed by multi-tenancy ticket 09 §1.
 *
 * A `draft` is freely editable and has no number. **Issue** is the atomic line
 * between editable and immutable: it assigns `base_number` / `display_number`,
 * freezes `document_snapshot`, raises the stage's Fee Invoice, and sets
 * `issued_at`. After Issue the row is never edited in place — a correction
 * **forks a new version** (`version + 1`, `supersedes_id` → the prior row, a
 * recorded `revision_reason`) and moves the prior row to `superseded`.
 *
 * `kind`:
 *  - `base` — the stage's original request (or a later version of it).
 *  - `additional` — an Additional Funding Request for approved scope growth
 *    (guidelines §19a). Never a version; both rows stay live and the stage's
 *    requirement is their sum. It takes its own `base_number`.
 *
 * Deposit progress (`partially_deposited` / `deposited` in the ticket's state
 * list) is **derived** from `deposits`, not stored here.
 *
 * RLS is applied by `app.enable_standard_rls('funding_requests')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
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

import { stages } from "./stages";
import type { DocumentSnapshot } from "./snapshot";

export const fundingRequestStatus = pgEnum("funding_request_status", [
  "draft",
  "issued",
  "superseded",
  "cancelled",
  "closed",
]);

export const fundingRequestKind = pgEnum("funding_request_kind", [
  "base",
  "additional",
]);

export const fundingRequests = pgTable(
  "funding_requests",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `stages (id, account_id)` below (cascade path: accounts → projects →
    // stages → funding_requests).
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),

    // The Task this request was drafted from, when a Task save created it
    // (one draft per Task — its material + labour lines are re-synced from the
    // Task while the request is still `draft`). A **loose column**, not a
    // composite FK — the same call as `tasks.subcontractor_id`: an issued
    // request must outlive its Task, and a plain SET NULL would null the
    // NOT NULL `account_id`. `NULL` for a request entered by hand.
    sourceTaskId: uuid("source_task_id"),

    kind: fundingRequestKind("kind").notNull().default("base"),
    status: fundingRequestStatus("status").notNull().default("draft"),

    // Numbering (ticket 09 §5): per-project sequential, assigned at Issue,
    // never at draft. Versions of one request share `base_number`; the
    // `display_number` string is frozen at Issue with the `v{n}` suffix.
    baseNumber: integer("base_number"),
    version: integer("version").notNull().default(1),
    displayNumber: text("display_number"),

    // Version chain. `supersedes_id` points at the row this one replaced;
    // that row's `status` becomes `superseded`. NO ACTION on delete — a
    // version chain is only ever removed whole, by the account/stage cascade.
    supersedesId: uuid("supersedes_id"),
    revisionReason: text("revision_reason"),
    cancelReason: text("cancel_reason"),

    notes: text("notes"),
    paymentInstructions: text("payment_instructions"),

    // Frozen at Issue; null while `draft`.
    documentSnapshot: jsonb("document_snapshot").$type<DocumentSnapshot>(),

    issuedAt: timestamp("issued_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("funding_requests_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "funding_requests_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "funding_requests_supersedes_id_account_id_fk",
      columns: [t.supersedesId, t.accountId],
      foreignColumns: [t.id, t.accountId],
    }).onDelete("no action"),
  ],
);
