/**
 * `material_stock_movements` — the append-only, per-project Material Stock
 * ledger (Phase 3 ticket 06, guidelines §36 "Surplus Material Handling").
 *
 * One row per event: `qty` is signed, and a project's current on-hand
 * balance for one material is `SUM(qty)` grouped by
 * `(account_id, project_id, item_key, unit)` — never a stored/upserted
 * balance row. This deliberately does **not** reuse `material_lines`'
 * delete-and-reinsert shortcut: a take-off line is a disposable per-edit
 * estimate scoped to one task, but Stock is a running balance that must
 * survive independently of any single stage's take-off edits, and it gates
 * whether a Purchase Order gets raised — exactly the kind of money-adjacent
 * exposure this project already treats as append-only-with-provenance
 * (Delivery/Payment records), not mutate-in-place.
 *
 * `item_key` is `lower(trim(item))`; `unit` is stored already
 * lowercased/trimmed too — there is no Material List register in this
 * codebase (confirmed unbuilt), so a normalised free-text key is the match,
 * not a foreign key to a price-book row. Typo drift ("Cement 50kg" vs
 * "cement 50 kg bag") is an accepted, minor v1 risk, mitigated (not
 * eliminated) by the take-off form's `<datalist>` autocomplete.
 *
 * `reason` is a closed 3-value enum — `carried_forward` (the only
 * increment, written by `carryForwardSurplus`, called from Stage Closeout),
 * `drawn_into_takeoff` (a manual, bounded "Apply from stock" amount on a
 * Material Take-Off line), `written_off` (a loss against material already
 * in the ledger from an earlier carry-forward only — a fresh, never
 * carried-forward surplus that's written off touches this ledger not at
 * all). No "returned to supplier" / "transferred within project" value
 * exists — Phase 1 ticket 06 found neither happens in practice, and this
 * ticket keeps the enum closed rather than building unused disposition
 * infrastructure.
 *
 * `source_stage_id` / `task_id` are optional provenance only (which stage's
 * closeout carried this forward or wrote it off; which task's take-off drew
 * it down) — `ON DELETE NO ACTION` on both, same posture as
 * `material_lines.variation_id`: a Stage is never deleted (only closed) and
 * a Task-delete is already gated elsewhere (`deleteTask` refuses one with
 * any Labour Payment), so a movement's provenance link is never expected to
 * dangle in practice, and if it ever would, failing loud beats silently
 * losing ledger history.
 *
 * No `updated_at`, no void columns: append-only with no reversal operation
 * defined yet (ticket 06's own "Consequences for the spec" — add one only if
 * a real correction need surfaces during the build).
 *
 * RLS is applied by `app.enable_standard_rls('material_stock_movements')` in
 * the RLS block at the end of migration `0009_material_stock_movements`.
 */
import { sql } from "drizzle-orm";
import {
  foreignKey,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { stages } from "./stages";
import { tasks } from "./tasks";

export const materialStockMovementReason = pgEnum(
  "material_stock_movement_reason",
  ["carried_forward", "drawn_into_takeoff", "written_off"],
);

export const materialStockMovements = pgTable(
  "material_stock_movements",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    projectId: uuid("project_id").notNull(),

    // Match key (ticket 06 §2): both sides normalised (`lower(trim(...))`) at
    // write time, never re-derived at read time.
    itemKey: text("item_key").notNull(),
    unit: text("unit").notNull(),

    qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
    reason: materialStockMovementReason("reason").notNull(),

    // Provenance only — optional, never read for the balance itself.
    sourceStageId: uuid("source_stage_id"),
    taskId: uuid("task_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("material_stock_movements_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "material_stock_movements_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "material_stock_movements_source_stage_id_account_id_fk",
      columns: [t.sourceStageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("no action"),
    foreignKey({
      name: "material_stock_movements_task_id_account_id_fk",
      columns: [t.taskId, t.accountId],
      foreignColumns: [tasks.id, tasks.accountId],
    }).onDelete("no action"),
  ],
);
