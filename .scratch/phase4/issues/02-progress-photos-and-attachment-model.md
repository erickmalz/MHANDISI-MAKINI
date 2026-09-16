# Progress Photos & attachment-model unification

Type: grilling
Status: resolved

## Question

Guidelines §31 wants photos attachable to eight different targets (Project,
Stage, Task, Site Diary, Purchase Delivery, Receipt, Variation, Stage
Closeout), each carrying date, caption, category, optional GPS, and an
uploaded timestamp. The app already has an `attachments` table
(`web/src/lib/data/schema/attachments.ts`, Operational Control Slice 4):
three nullable FK columns (Purchase Order / Payment Record / Labour
Payment), each capped at **exactly one** row via a `UNIQUE` constraint —
"one proof file per financial record." Does Progress Photos extend that
table, or is it a new one?

## Answer

**New table, `photos`.** `attachments`'s one-per-record `UNIQUE` cap is
load-bearing for its own feature (a receipt/invoice proof file has no
reason to be plural) and is already relied on elsewhere
(`AttachmentCard.tsx`, `stage-closeout.ts`). Progress Photos is a genuinely
different feature — many photos per target, a caption+category+GPS+capture-
date shape the financial `attachments` rows don't carry, and three targets
(Project, Stage, Task) that aren't financial records at all. Reusing
`attachments` would mean either dropping its `UNIQUE` caps (breaking the
"proof file" guarantee other code already depends on) or bolting a second,
incompatible shape onto the same table. A clean new table costs nothing —
it's the same `bytea`-in-Postgres, no-S3 infra `attachments`/`accounts.logo`
already use.

`photos` schema: seven nullable FK columns — `project_id`, `stage_id`,
`task_id`, `site_diary_entry_id`, `delivery_id`, `payment_record_id`
(covers both "Purchase delivery" and "Receipt" targets, since a receipt is
already a Payment Record's proof), `variation_id`. §31's eighth target,
"Stage closeout," gets no FK of its own — a closeout-illustrating photo is
just a `stage_id`-targeted row tagged `category = 'closeout'`, since there
is no `stage_closeouts` row to hang it off (Phase 3 decision 5 kept
closeout to a plain `stages.status` flip; ticket 03 below adds a frozen
document snapshot, not a live table a photo could reference). No `UNIQUE`
cap on any column (many photos per target), plus `category` (enum:
`progress | material_delivery | issue | before | after | receipt |
delivery_note | variation | closeout`, exactly §31's list), `caption`,
`gps_lat`/`gps_lng` (nullable), `captured_on` (nullable — the photo's own
date, distinct from `created_at`/upload time).
The DAL enforces "exactly one target FK set," matching how `attachments`
already enforces its own polymorphism.

**"Receipt" and "Purchase delivery" as photo categories vs. the existing
proof-file `attachments`**: these stay two separate, non-conflicting
concepts. `attachments` is the one required/singular *proof document* a
financial record needs for reconciliation; a `photos` row tagged `receipt`
or `delivery_note` is an *illustrative* photo in the visual timeline (e.g.
a phone snapshot of a delivery note lying on site, not the authoritative
attached proof). No UI or data forces them to agree, and nothing merges
them.

### Consequences for the spec

- New `photos` table + migration, DAL (`setPhoto`/`listPhotos` per target),
  screens: an inline photo strip on Project/Stage/Task/Site Diary
  Entry/Delivery/Payment/Variation detail pages, uploading with a category
  picker and optional caption/GPS.
- `attachments` is untouched — no column, constraint, or DAL signature
  changes.
- Ticket 01 (Site Diary) and ticket 03 (Stage Closeout Report) both depend
  on this table existing first.
