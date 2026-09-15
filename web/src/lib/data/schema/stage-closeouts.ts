/**
 * `stage_closeouts` — the frozen Stage Closeout Report (guidelines §38, §50;
 * Phase 4 ticket 03, `.scratch/phase4/issues/03-stage-closeout-report.md`;
 * Slice 4.2).
 *
 * One row per Stage (`UNIQUE(stage_id)` — a Stage closes exactly once;
 * nothing in this codebase reopens a `completed` Stage back to editable).
 * Written **inside the existing `closeStage` transaction**
 * (`src/lib/data/stage-closeout.ts`), the same atomic moment `stages.status`
 * flips to `completed` — Close Stage *is* issuing the report, mirroring how
 * Issuing a Funding Request is freezing its `document_snapshot` (ticket 03's
 * resolved answer). No separate "Run Report" action exists.
 *
 * `document_snapshot` carries the full report content (`kind:
 * "stage_closeout_report"` — `./snapshot.ts`), rendered by the same
 * `web/src/lib/documents/` PDF/JPG pipeline as the other three issued
 * documents; `base_number`/`display_number` are minted the same way
 * (`claimDocumentNumber`, `documentNumberType` = `"stage_closeout_report"`,
 * `SCR-{project_code}-{NNN}` — `src/lib/data/stage-closeout.ts`).
 *
 * A Stage closed **before** this table existed has no row here — the Stage
 * Closeout screen shows "Report not available" rather than a broken
 * download link for those (ticket 03's resolved answer: no backfill
 * migration, since Phase 3's Slice 3.4/3.5 never stored the inputs needed to
 * reconstruct a historically-accurate snapshot).
 *
 * Table-vs-column judgment call (ticket 03 left this open): a **new table**,
 * not a `document_snapshot` column on `stages` — keeps `stages` (a long-lived,
 * frequently-read row) free of a one-time-write JSONB blob, and gives the
 * report its own row/PK other code can reference (the same shape as
 * `funding_requests` / `fee_invoices` / `purchase_orders`, none of which
 * freeze their snapshot onto a shared parent row either).
 *
 * RLS is applied by `app.enable_standard_rls('stage_closeouts')` in the
 * hand-merged block at the end of whichever migration generation assigns
 * this table (next number at the time of writing: `0010_*`) — migration
 * generation is centralized after Phase 4 integration, so no migration file
 * is added by this slice.
 */
import { sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { DocumentSnapshot } from "./snapshot";
import { stages } from "./stages";

export const stageCloseouts = pgTable(
  "stage_closeouts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    // Denormalised tenant key — integrity runs through the composite FK to
    // `stages (id, account_id)` below, same posture as every other child
    // table here.
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),

    baseNumber: integer("base_number").notNull(),
    displayNumber: text("display_number").notNull(),

    // Typed via the `DocumentSnapshot` union (`./snapshot.ts`); this row's
    // `kind` is always `"stage_closeout_report"`, narrowed by the DAL/render
    // layer, not by the column type itself (jsonb has no discriminant at the
    // schema level, matching every other `document_snapshot` column here).
    documentSnapshot: jsonb("document_snapshot")
      .$type<DocumentSnapshot>()
      .notNull(),

    closedOn: date("closed_on").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("stage_closeouts_stage_id_key").on(t.stageId),
    foreignKey({
      name: "stage_closeouts_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
  ],
);
