/**
 * `material_lines` — the Material Take-Off lines under a Task (guidelines §16,
 * §50). The estimate columns feed Material Variance (Phase 1 decision 01);
 * the Approved-Estimate revision chain (§17) and the actual-cost side arrive in
 * a later slice.
 *
 * RLS is applied by `app.enable_standard_rls('material_lines')` in
 * the RLS block at the end of migration `0002_domain_structure`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { tasks } from "./tasks";

export const materialLines = pgTable(
  "material_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `tasks (id, account_id)` below.
    accountId: uuid("account_id").notNull(),
    taskId: uuid("task_id").notNull(),

    item: text("item").notNull(),
    description: text("description"),
    qtyOriginal: numeric("qty_original", { precision: 14, scale: 3 }),
    qtyRevised: numeric("qty_revised", { precision: 14, scale: 3 }),
    unit: text("unit").notNull(),
    estUnitCostOriginal: bigint("est_unit_cost_original", { mode: "number" }),
    estUnitCostRevised: bigint("est_unit_cost_revised", { mode: "number" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("material_lines_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "material_lines_task_id_account_id_fk",
      columns: [t.taskId, t.accountId],
      foreignColumns: [tasks.id, tasks.accountId],
    }).onDelete("cascade"),
  ],
);
