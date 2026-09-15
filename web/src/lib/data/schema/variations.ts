/**
 * `variations` — a formally logged scope change against one Task (guidelines
 * §29; CONTEXT.md "Variation"). Phase 3 ticket 01
 * (`.scratch/phase3/issues/01-variation-module.md`) fixes the mechanics:
 *
 * - **Four stored states** (`variation_status`), not the guidelines' eight —
 *   `Submitted` is dropped (no client login; moving a Draft to Approved/Rejected
 *   *is* the decision event), `Funded` is derived (read off
 *   `additional_funding_request_variations` + the linked request's own status,
 *   never stored), and `In Progress`/`Completed` are dropped (the physical work
 *   is tracked on the Task itself — duplicating it here would be a second,
 *   driftable source of truth).
 * - **Numbering**: `VO-{project_code}-NNN`, minted at Approve via the same
 *   `claimDocumentNumber` helper Funding Requests / Purchase Orders use — a
 *   Draft has no number; Rejected/Cancelled Variations never get one.
 * - **Approve is the one caller allowed to write past a locked stage's
 *   `stageBudgetLocked`** (`src/lib/data/tasks.ts`): it revises the Task's
 *   `labour_revised` in place and *appends* a tagged `material_lines` row
 *   (`material_lines.variation_id`) for the material impact — the original
 *   estimate/agreement values are never touched, satisfying "without deleting
 *   original values" literally. See `src/lib/data/variations.ts`.
 * - **`fee_impact` is a carried note only** — no new fee-invoicing path; the
 *   Engineer keys the same figure into an Additional Funding Request's own fee
 *   line by hand when they raise one.
 * - **No client login**: `approved_at` / `client_reference` are the Engineer's
 *   own record of the client's real-world sign-off, not a workflow gate (same
 *   posture as Purchase Order's `supplier_ack_note`/`supplier_ack_on`).
 *
 * `stage_id` + `task_id` are both composite-FK'd `(id, account_id)` per this
 * schema's honesty rule; `task_id`'s Stage is always this same `stage_id`
 * (validated by the DAL, not a DB constraint — Drizzle/Postgres have no
 * cross-table-path check).
 *
 * RLS is applied by `app.enable_standard_rls('variations')` in the hand-merged
 * block at the end of this table's migration.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { stages } from "./stages";
import { tasks } from "./tasks";

export const variationStatus = pgEnum("variation_status", [
  "draft",
  "approved",
  "rejected",
  "cancelled",
]);

export const variations = pgTable(
  "variations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FKs to
    // `stages (id, account_id)` and `tasks (id, account_id)` below.
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    taskId: uuid("task_id").notNull(),

    status: variationStatus("status").notNull().default("draft"),

    // Numbering (ticket 01 §2): per-project sequential, assigned at Approve,
    // never at Draft.
    baseNumber: integer("base_number"),
    displayNumber: text("display_number"),

    description: text("description").notNull(),
    reason: text("reason"),

    // Signed whole-shilling amounts — a scope change can reduce as well as add
    // (ticket 01 §3). `fee_impact` is a carried note only (ticket 01 §5).
    materialImpact: bigint("material_impact", { mode: "number" }),
    labourImpact: bigint("labour_impact", { mode: "number" }),
    feeImpact: bigint("fee_impact", { mode: "number" }),

    // Set at Draft creation, never re-entered (ticket 01 §6).
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // The client's real-world sign-off date, Engineer-entered — a dated note,
    // not a system clock (ticket 01 §6, same idiom as PO `supplier_ack_on`).
    approvedAt: date("approved_at"),
    clientReference: text("client_reference"),
    notes: text("notes"),

    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    unique("variations_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "variations_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "variations_task_id_account_id_fk",
      columns: [t.taskId, t.accountId],
      foreignColumns: [tasks.id, tasks.accountId],
    }).onDelete("cascade"),
  ],
);
