/**
 * `photos` — a progress photo attachable to any of seven targets (guidelines
 * §31; Phase 4 ticket 02,
 * `.scratch/phase4/issues/02-progress-photos-and-attachment-model.md`).
 *
 * A deliberate sibling to `attachments.ts`, **not** a reuse of it:
 * `attachments`'s one-proof-file-per-record `UNIQUE` cap is load-bearing for
 * its own feature (a receipt/invoice proof file has no reason to be plural)
 * and is already relied on elsewhere (`AttachmentCard.tsx`,
 * `stage-closeout.ts`) — reusing it would mean either dropping that cap or
 * bolting an incompatible shape onto the same table. `photos` instead carries
 * many rows per target (no `UNIQUE` on any FK column) plus a
 * caption/category/GPS/captured-date shape `attachments` doesn't have (ticket
 * 02's Answer).
 *
 * Polymorphic the same way `attachments` is: seven nullable FK columns
 * rather than a loose `entity_type`/`entity_id` pair, each composite-FK'd
 * `(target_id, account_id)` → the target table, `ON DELETE CASCADE` — a
 * photo has no life of its own once the record it illustrates is gone.
 * Exactly one of the seven is set per row; the DAL enforces that structurally
 * (every insert goes through `setPhoto`, which accepts exactly one target and
 * leaves the other six columns at their default `NULL` — no DB `CHECK`, same
 * posture `attachments.ts`'s doc comment describes for its own polymorphism).
 *
 * §31's eighth target, "Stage Closeout," gets no FK of its own — a
 * closeout-illustrating photo is just a `stage_id`-targeted row tagged
 * `category = 'closeout'` (ticket 02's Answer: there is no `stage_closeouts`
 * row to hang a photo off — Phase 3 decision 5 kept closeout to a plain
 * `stages.status` flip).
 *
 * "Receipt" and "Purchase delivery" (`delivery_id`) cover both of §31's
 * "Purchase delivery" and "Receipt" targets — a receipt is already a Payment
 * Record's proof, so `payment_record_id` stands in for it. These `photos`
 * rows are illustrative snapshots in the visual timeline, a separate concept
 * from the required, singular proof-file `attachments` row a financial
 * record needs for reconciliation — nothing merges them (ticket 02's Answer).
 *
 * Raw bytes in Postgres (`bytea`), same call as `attachments.file` /
 * `accounts.logo` — no S3/blob/CDN in this self-hosted, single-container app
 * (ADR 0001).
 *
 * RLS is applied by `app.enable_standard_rls('photos')` in the hand-merged
 * block at the end of this table's migration.
 */
import { sql } from "drizzle-orm";
import {
  customType,
  date,
  doublePrecision,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { deliveryRecords } from "./delivery-records";
import { paymentRecords } from "./payment-records";
import { projects } from "./projects";
import { siteDiaryEntries } from "./site-diary-entries";
import { stages } from "./stages";
import { tasks } from "./tasks";
import { variations } from "./variations";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** §31's recommended category list, verbatim. */
export const photoCategory = pgEnum("photo_category", [
  "progress",
  "material_delivery",
  "issue",
  "before",
  "after",
  "receipt",
  "delivery_note",
  "variation",
  "closeout",
]);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),

    // Seven nullable target FKs — exactly one is set per row (DAL-enforced,
    // see the table doc comment above).
    projectId: uuid("project_id"),
    stageId: uuid("stage_id"),
    taskId: uuid("task_id"),
    siteDiaryEntryId: uuid("site_diary_entry_id"),
    deliveryId: uuid("delivery_id"),
    paymentRecordId: uuid("payment_record_id"),
    variationId: uuid("variation_id"),

    file: bytea("file").notNull(),
    contentType: text("content_type").notNull(),
    filename: text("filename").notNull(),
    category: photoCategory("category").notNull(),
    caption: text("caption"),
    // Optional GPS (§31) — plain floating-point degrees is precise enough for
    // a phone-camera coordinate and matches no other lat/lng column existing
    // elsewhere in this schema to follow instead.
    gpsLat: doublePrecision("gps_lat"),
    gpsLng: doublePrecision("gps_lng"),
    // The photo's own date, distinct from `created_at` (upload time) —
    // nullable, since a supervisor may not always back-date a photo.
    capturedOn: date("captured_on"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("photos_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "photos_project_id_account_id_fk",
      columns: [t.projectId, t.accountId],
      foreignColumns: [projects.id, projects.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_task_id_account_id_fk",
      columns: [t.taskId, t.accountId],
      foreignColumns: [tasks.id, tasks.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_site_diary_entry_id_account_id_fk",
      columns: [t.siteDiaryEntryId, t.accountId],
      foreignColumns: [siteDiaryEntries.id, siteDiaryEntries.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_delivery_id_account_id_fk",
      columns: [t.deliveryId, t.accountId],
      foreignColumns: [deliveryRecords.id, deliveryRecords.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_payment_record_id_account_id_fk",
      columns: [t.paymentRecordId, t.accountId],
      foreignColumns: [paymentRecords.id, paymentRecords.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "photos_variation_id_account_id_fk",
      columns: [t.variationId, t.accountId],
      foreignColumns: [variations.id, variations.accountId],
    }).onDelete("cascade"),
  ],
);
