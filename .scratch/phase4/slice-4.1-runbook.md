# Slice 4.1 — Site Diary + Progress Photos — runbook

> **Verified 2026-09-15** — CI run `35028451814` on PR #5 green: `lint`, `typecheck`, migrations (incl. `0010`), the isolation suite, and `build` all ✓.
> `npm run lint` and
> `npm run typecheck` both clean in WSL (see "Verify" below). No migration
> generated — schema `.ts` only, per this slice's hard constraint; the
> integrator generates and hand-merges the RLS block centrally after every
> parallel Phase 4 slice lands.

## What changed

Implements ticket 01 (`.scratch/phase4/issues/01-site-diary.md`) and ticket
02 (`.scratch/phase4/issues/02-progress-photos-and-attachment-model.md`)
together, in one slice, because `photos.site_diary_entry_id` FKs into
`site_diary_entries` — the two tables must land in the same migration.

### Schema (no migration generated — integrator's job)

- **New `src/lib/data/schema/site-diary-entries.ts`** — `site_diary_entries`:
  `id`, `account_id`, `project_id` + `stage_id` (both composite-FK'd
  `(id, account_id)` → `projects`/`stages`, `ON DELETE CASCADE`),
  `entry_date` (`date`, required), then the §30 narrative columns verbatim
  from guidelines §50's list — `weather`, `workers_on_site` (`integer`),
  `activities`, `materials_used`, `equipment_used`, `delays`, `issues`,
  `instructions`, `visitors`, `notes` (all nullable `text`), `created_at`/
  `updated_at`. Nothing mandatory beyond project/stage/date (ticket 01's
  Answer). "Materials received" folds into `materials_used` as one
  free-text field, matching the ticket's literal reading. No `photos`
  column — §30's "Photos" field is `photos` rows targeting the entry
  (ticket 02).
- **New `src/lib/data/schema/photos.ts`** — `photo_category` enum
  (`progress | material_delivery | issue | before | after | receipt |
  delivery_note | variation | closeout`, §31's list verbatim) and the
  `photos` table: seven nullable target FKs (`project_id`, `stage_id`,
  `task_id`, `site_diary_entry_id`, `delivery_id`, `payment_record_id`,
  `variation_id`), each composite-FK'd `(target_id, account_id)` → its
  target table, `ON DELETE CASCADE`, **no per-column `UNIQUE`** (many
  photos per target, unlike `attachments`). Plus `file` (`bytea`, same
  `customType` as `attachments.ts`), `content_type`, `filename`,
  `category` (required), `caption` (nullable), `gps_lat`/`gps_lng`
  (nullable `doublePrecision` — see "Deviations"), `captured_on` (nullable
  `date`), `created_at`. §31's eighth target, "Stage Closeout," gets no FK
  of its own — a closeout photo is a `stage_id`-targeted row tagged
  `category = 'closeout'` (ticket 02's Answer). "Exactly one of the seven
  FKs set" is enforced structurally by the DAL (`setPhoto` always inserts
  through exactly one target column), not a DB `CHECK` — same posture
  `attachments.ts`'s doc comment describes for its own polymorphism.
- **`src/lib/data/schema/index.ts`** — extended with one new, clearly
  separate, appended block: `// Phase 4 Slice 4.1 — Site Diary + Progress
  Photos` exporting `./site-diary-entries` then `./photos`, after the last
  existing export (Phase 3 Slice 3.3's `material-stock-movements`). No
  existing export touched.

**RLS for the integrator**: `app.enable_standard_rls('site_diary_entries')`
and `app.enable_standard_rls('photos')` both need adding to the hand-merged
RLS block at the end of this slice's migration (neither table's RLS is
applied anywhere in the `.ts` schema itself, per this codebase's standing
convention).

### View models (no data access, client-safe)

- **New `src/lib/site-diary.ts`** — `SiteDiaryEntry` interface only. No
  lifecycle/status type (unlike `Variation`/`PurchaseOrder`) — a diary entry
  has none.
- **New `src/lib/photos.ts`** — `PhotoCategory`, `PHOTO_CATEGORIES`,
  `photoCategoryLabel`, `PhotoTarget` (the seven live target kinds —
  `project | stage | task | siteDiaryEntry | delivery | paymentRecord |
  variation`), `PhotoMeta`.

### Validation (isomorphic Zod)

- **New `src/lib/validation/site-diary.ts`** — `siteDiaryEntrySchema`:
  `entryDate` required (`YYYY-MM-DD`), every other field optional
  (`optText`/coerced-optional-number, same `emptyToUndefined` idiom as
  `validation/structure.ts`).
- **New `src/lib/validation/photos.ts`** — `photoMetaSchema`: `category`
  required (one of `PHOTO_CATEGORIES`), `caption`/`gpsLat`/`gpsLng`/
  `capturedOn` all optional (GPS bounded to valid lat/lng ranges). The
  file itself is validated in the Server Action, not here — same split as
  `actions/attachments.ts` (a `File` from `FormData` isn't something Zod
  parses directly).

### DAL

- **New `src/lib/data/site-diary.ts`** — no `accountId` in any signature
  (`withAccount` + RLS, standard posture), mirrors the Variation DAL's
  shape:
  - `listSiteDiaryEntries(stageId)` — every entry for a Stage, **most
    recent date first** (a sensible default the ticket didn't specify —
    see "Deviations").
  - `getSiteDiaryEntry(entryId)`.
  - `createSiteDiaryEntry(stageId, input)` — validates the stage exists,
    derives `projectId` from it (never taken from the caller). Returns
    `null` if the stage is missing/cross-account.
  - `updateSiteDiaryEntry(entryId, input)` — replaces the body **in
    place** (no versioning/append-only — ticket 01's Answer).
  - `deleteSiteDiaryEntry(entryId)` — plain delete, no void/cancel state
    (see "Deviations" — not explicitly asked for, but consistent with the
    ticket's "low-stakes narrative record" framing).
- **New `src/lib/data/photos.ts`** — generic across all seven targets:
  - `listPhotos(target, targetId)` — every photo on one target, newest
    first.
  - `getPhotoFile(photoId)` — raw bytes for the download route.
  - `setPhoto(target, targetId, input)` — **adds** a photo (never
    replaces, unlike `attachments.setAttachment`) via a `switch` over the
    seven targets (mirrors `setAttachment`'s per-target `case` style for
    type safety) — each `case` sets exactly one FK column, structurally
    guaranteeing "exactly one target set."
  - `deletePhoto(photoId)` — needed for the `PhotoStrip`'s per-photo
    Remove button; not explicitly named in the ticket's `setPhoto`/
    `listPhotos` pair, but required for any usable multi-photo UI (see
    "Deviations").
- **`src/lib/data/index.ts`** — extended with one new, appended block (`//
  Phase 4 Slice 4.1 — Site Diary + Progress Photos`) exporting both new
  DAL modules' functions/types. No existing export touched.

### Server Actions

- **New `src/app/actions/site-diary.ts`** — `createSiteDiaryEntryAction`,
  `updateSiteDiaryEntryAction` (`useActionState`-shaped, ids as bound
  args, redirect back to the Stage page on success), `deleteSiteDiaryEntryAction`
  (plain void action, mirrors `removePurchaseOrderAttachmentAction`).
- **New `src/app/actions/photos.ts`** — `uploadStagePhotoAction`,
  `uploadSiteDiaryPhotoAction` (both call one shared, already-generic
  `uploadPhoto(target, targetId, revalidateHref, formData)` — adding a
  Task/Delivery/Payment/Variation upload action later is a one-line
  wrapper, no change to `uploadPhoto` itself), `deletePhotoAction`. Same
  8MB / PNG-JPEG-WEBP validation posture as `actions/attachments.ts`'s
  5MB / PDF-PNG-JPEG (photos are camera shots, no PDF).

### Route

- **New `src/app/(app)/photos/[photoId]/route.ts`** — serves one photo's
  raw bytes, `inline`, same session-gate/404 pattern as
  `/attachments/[attachmentId]`.

### UI

- **New `src/components/photos/PhotoStrip.tsx`** (client) — the reusable
  strip: thumbnail grid (`<img>` from `/photos/[id]`, Remove button per
  photo) + an upload form (file input, category `<select>`, and a
  collapsed `<details>` disclosure for optional caption/GPS lat-lng/
  capture-date, keeping the common case — file + category — uncluttered).
  Takes no target-specific prop: the caller pre-binds `uploadAction`/
  `deleteAction` to whichever target it represents, so it's already ready
  for Task/Delivery/Payment/Variation pages without any change to this
  component.
- **New `src/app/(app)/projects/_components/SiteDiaryEntryForm.tsx`**
  (client) — shared create/edit form, mirrors `StageForm`'s shape; every
  field but the date is optional.
- **New `.../stages/[stageId]/diary/new/page.tsx`** and
  **`.../diary/[entryId]/edit/page.tsx`** — thin wrappers around
  `SiteDiaryEntryForm`, mirror `tasks/new/page.tsx`'s skeleton. The edit
  page converts the DAL's `null`-shaped `SiteDiaryEntry` into the
  `undefined`-shaped `SiteDiaryEntryInput` inline (same conversion
  `getVariationDraftInput` does inside the DAL — done here in the page
  instead, since there's no separate "get draft input" DAL function for
  this ticket's simpler shape).
- **New `.../stages/[stageId]/_components/SiteDiarySection.tsx`** (server)
  — the Stage page's "Site Diary" section: entries listed most-recent-date
  first, each as a `Card` showing every populated §30 field (blank fields
  hidden, not shown empty), Edit/Delete controls, and an inline
  `PhotoStrip` bound to that entry (ticket 01's "each entry showing its
  inline photo strip").
- **`.../stages/[stageId]/page.tsx`** — extended (not rewritten) with two
  new sections after Variations: a "Stage photos" `PhotoStrip` bound to
  the stage itself (ticket 02's "wire onto the Stage detail page" proof of
  generality) and the new `SiteDiarySection`. Fetches
  `listPhotos("stage", stageId)` and `listSiteDiaryEntries(stageId)` in the
  existing `Promise.all`, then one further `listPhotos("siteDiaryEntry",
  entry.id)` per entry (see "Deviations" — N+1, acceptable at expected
  diary-entry volumes).

## Deviations from the ticket's literal text (for the integrator / downstream slices)

- **`listSiteDiaryEntries` orders most-recent-date first**, not
  chronologically ascending. Ticket 01 doesn't specify an order; the map's
  own framing ("provides a chronological project record") reads either way,
  but a supervisor reviewing a stage almost always wants the latest entry
  on top, matching how every other feed-like list in this app (e.g. Activity
  History, ticket 05, not yet built) will likely read. Flagged in case a
  downstream reader expects ascending order.
- **`deleteSiteDiaryEntry` and `deletePhoto` exist even though the ticket's
  brief named only `setPhoto`/`listPhotos`/`getPhotoFile` for photos and
  didn't discuss diary-entry deletion at all.** Both are safe, natural CRUD
  completions given ticket 01's own framing ("editable in place," "a
  low-stakes narrative record, not a financial one" — no cancel/void state
  needed) and ticket 02's "many photos per target" model (a strip with no
  way to remove a mis-tagged photo isn't a usable UI). Neither introduces
  any new state machine or column.
- **The Stage page's per-entry photo fetch is N+1** (`listPhotos` called
  once per diary entry, each its own `withAccount` transaction) rather than
  one batched query keyed by `site_diary_entry_id IN (...)`. Acceptable at
  the diary's expected volume (a handful of entries per stage visit), but a
  batched `listPhotosForEntries(entryIds)` would be the fix if a stage ever
  accumulates dozens of entries. Flagged, not fixed, to keep this slice's
  DAL surface exactly the shape the brief asked for (`listPhotos(target,
  targetId)`, singular).
- **GPS columns are `doublePrecision`, not `numeric`.** The brief offered
  both; nothing else in this schema stores a lat/lng pair to follow instead,
  and plain floating-point degrees is precise enough for a phone-camera
  coordinate with no rounding/display requirement that would call for exact
  decimal (`numeric`) semantics.
- **`PhotoStrip`'s GPS/caption/capture-date inputs sit inside a collapsed
  `<details>` disclosure**, not inline with the file/category controls.
  Ticket 02 asks for "optional caption/GPS" on the upload UI without
  specifying layout; collapsing the less-used fields keeps the common
  "snap a photo, pick a category, upload" path uncluttered on a phone
  screen, which is this feature's primary use case per guidelines §30's own
  example.

## Not done in this slice (explicit fast-follows, per the ticket's own scoping)

- `PhotoStrip` is wired onto Stage (general) and Site Diary Entry only.
  Task, Delivery, Payment Record, and Variation pages get no upload UI yet
  — the DAL/schema already fully supports all seven targets
  (`setPhoto`/`listPhotos` take any `PhotoTarget`), so wiring a new page is
  a small, additive change (one bound Server Action + one `<PhotoStrip>`
  call), never a schema or DAL change.

## Interface for downstream slices / the integrator

- **Tables**: `site_diary_entries` (columns: `id, account_id, project_id,
  stage_id, entry_date, weather, workers_on_site, activities,
  materials_used, equipment_used, delays, issues, instructions, visitors,
  notes, created_at, updated_at`); `photos` (columns: `id, account_id,
  project_id, stage_id, task_id, site_diary_entry_id, delivery_id,
  payment_record_id, variation_id, file, content_type, filename, category,
  caption, gps_lat, gps_lng, captured_on, created_at`).
- **Enum**: `photo_category` = `'progress' | 'material_delivery' | 'issue'
  | 'before' | 'after' | 'receipt' | 'delivery_note' | 'variation' |
  'closeout'` (stored TS type `PhotoCategory` in `src/lib/photos.ts`).
- **RLS to add**: `app.enable_standard_rls('site_diary_entries')` and
  `app.enable_standard_rls('photos')` in the hand-merged migration block.
- **Photo targets**: `PhotoTarget` (`src/lib/photos.ts`) — `"project" |
  "stage" | "task" | "siteDiaryEntry" | "delivery" | "paymentRecord" |
  "variation"`. Ticket 03 (Stage Closeout Report) can attach an
  illustrating photo to a closeout via `setPhoto("stage", stageId, {
  category: "closeout", ... })` — there is no eighth target/column to add.
- **`setPhoto(target, targetId, input): Promise<string>`** /
  **`listPhotos(target, targetId): Promise<PhotoMeta[]>`** /
  **`getPhotoFile(photoId)`** / **`deletePhoto(photoId)`**
  (`src/lib/data/photos.ts`) — the whole read/write surface any future
  target's upload UI needs; no schema or DAL change required to wire a new
  target.

## Verify

```bash
cd web
npm run typecheck   # clean in WSL (next typegen && tsc --noEmit)
npm run lint        # clean in WSL
```

No migration generated — per this slice's hard constraint, schema `.ts`
only. `db:migrate` / `npm test` / `npm run build` are for the integrator's
CI pass once this slice (and its siblings) are merged onto
`phase4-site-history-reporting`.

## Report back

Built on top of a fast-forward from `phase4-site-history-reporting`
(commit `1ef906b`) inside this isolated worktree. Not pushed, no PR opened
(per this slice's constraints) — committed locally only. `npm run lint`
and `npm run typecheck` both clean. Slice 4.1 (tickets 01 + 02) is done;
ready for the integrator to fold in alongside 4.2/4.3/4.4/4.5 per
`.scratch/phase4/status.md`'s integration order.
