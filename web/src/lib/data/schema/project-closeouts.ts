/**
 * `project_closeouts` — the frozen `project_closeout_report` snapshot minted
 * once a Project is Completed (Phase 4 ticket 04, `.scratch/phase4/issues/
 * 04-project-closeout.md`). Same freeze-at-a-lifecycle-event discipline as
 * every other issued document (`funding_requests.document_snapshot`,
 * `purchase_orders.document_snapshot`) — a report a client or the
 * supervisor's own records might reference later must read the same today as
 * it did the day the project closed, even if a later correction touches a
 * stage's live figures.
 *
 * A **new table**, not a `document_snapshot` column bolted onto `projects`
 * (the ticket left this a build-time DDL choice, same as Stage Closeout
 * Report's own open question). Chosen because:
 *  - `projects` already carries one genuinely optional one-time-write column
 *    (`completed_on`); a second (`document_snapshot` jsonb, needed only once,
 *    only after Complete) would start accumulating exactly the kind of
 *    write-once baggage this schema's own doc comments elsewhere warn against.
 *  - A dedicated table gives the report its own primary key and `created_at`,
 *    ready for a future second closeout-adjacent record without another
 *    `projects` migration.
 *  - It mirrors this file's sibling `document_snapshot` tables (`funding_requests`,
 *    `fee_invoices`, `purchase_orders`) structurally, even though those freeze
 *    in place on an existing row rather than a dedicated one — the closest
 *    existing precedent for "a snapshot with nothing else on the row" is
 *    `attachments`, itself a small dedicated table.
 *
 * One row per Project — `UNIQUE (project_id)` — since Complete only ever runs
 * once per project (no re-complete flow; Archive writes no new snapshot, per
 * the ticket's Answer).
 *
 * RLS is applied by `app.enable_standard_rls('project_closeouts')` in the
 * hand-merged block at the end of whichever migration lands this table
 * (number TBD by the integrator — see the Slice 4.3 runbook).
 */
import { sql } from "drizzle-orm";
import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";
import type { DocumentSnapshot } from "./snapshot";

export const projectCloseouts = pgTable(
  "project_closeouts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `projects (id, account_id)` below.
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),

    // Minted via `claimDocumentNumber(..., "project_closeout_report")` inside
    // the `completeProject` transaction — `PCR-{project_code}-001`.
    displayNumber: text("display_number").notNull(),
    documentSnapshot: jsonb("document_snapshot").$type<DocumentSnapshot>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("project_closeouts_id_account_id_key").on(t.id, t.accountId),
    unique("project_closeouts_project_id_key").on(t.projectId),
    foreignKey({
      name: "project_closeouts_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
  ],
);
