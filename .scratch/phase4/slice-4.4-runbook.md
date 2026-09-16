# Slice 4.4 — Comprehensive Activity History — runbook

> **Verified 2026-09-15** — CI run `35028451814` on PR #5 green: `lint`, `typecheck`, migrations (incl. `0010`), the isolation suite, and `build` all ✓.
> Typecheck
> (`npm run typecheck`) and lint (`npm run lint`, plus a targeted
> `npx eslint` on the changed files) are clean in this worktree. Not yet run
> through CI on a PR — this worktree is not pushed.

## What changed

Implements ticket 05
(`.scratch/phase4/issues/05-comprehensive-activity-history.md`) in full.

### Schema — no migration

No new table, no new column. Pure computation over existing tables — same
posture as `src/lib/data/reconciliation.ts` (Slice 3.5). Nothing was run
against `drizzle-kit generate`; none is needed, since every column read here
already exists (confirmed by reading each schema file listed in the ticket
before writing any query).

### DAL — `src/lib/data/activity.ts` (new)

**`getProjectActivity(projectId, options?: { stageId?: string }): Promise<ActivityEvent[]>`**
— the single entry point, `withAccount`-wrapped, computed fresh on every call
(no stored result). Returns a flat, merged, newest-first list of
`ActivityEvent`:

```ts
interface ActivityEvent {
  id: string;            // `{recordType}:{recordId}:{eventKey}` — unique per event
  occurredAt: string;    // ISO 8601
  recordType: ActivityRecordType;
  recordId: string;
  stageId: string;
  stageName: string;
  summary: string;       // composed at read time from the record's own columns
  href: string;           // links straight to the record
}
```

Nine tables are unioned, each via its own small `tx.execute` raw-SQL query
joined to `stages` (directly or transitively) and filtered by
`stages.project_id = projectId` (+ `stages.id = stageId` when a Stage filter
is passed):

| Table | Events emitted | Timestamp/status column(s) used |
|---|---|---|
| `stages` | created; started (if `started_on` set); completed (if `completed_on` set) | `created_at`, `started_on`, `completed_on` |
| `tasks` | created; started (if `started_on` set); completed (if `completed_on` set) | `created_at`, `started_on`, `completed_on` |
| `variations` | drafted (always); approved; rejected; cancelled | `requested_at`, `approved_at`, `rejected_at`, `cancelled_at`, gated by `status` |
| `purchase_orders` | drafted (always); ordered; cancelled; closed; reopened | `created_at`, `ordered_at`, `cancelled_at`, `closed_at`, `reopened_at` |
| `funding_requests` | drafted (always); issued; superseded; cancelled; closed | `created_at`, `issued_at`, `superseded_at`, `cancelled_at`, `closed_at`, gated by `status`/`kind` |
| `deposits` | received; voided (if voided) | `received_on`, `voided_at` |
| `payment_records` | recorded; voided (if voided) | `paid_on`, `voided_at` |
| `labour_payments` | recorded; voided (if voided) | `paid_on`, `voided_at` |
| `delivery_records` | recorded; voided (if voided) | `delivered_on`, `voided_at` |

Every `summary` is composed from the record's own already-stored columns at
read time — most notably each record's own `display_number` (`FR-…`,
`PO-…`, `VO-…`) where one has been minted — never a separately stored
message. `href` points straight at the record's existing detail/edit screen
(`/projects/{id}/variations/{vid}`, `/projects/{id}/procurement/{poId}`,
`/projects/{id}/funding/{frId}`, `/projects/{id}/tasks/{taskId}/edit`,
`/projects/{id}/stages/{stageId}`); Deposit/Payment/Delivery events (which
have no detail screen of their own) link to their parent Funding
Request/Purchase Order.

Exported from `@/lib/data` as `getProjectActivity`, alongside the
`ActivityEvent` / `ActivityRecordType` types.

### Screen — `src/app/(app)/projects/[id]/activity/page.tsx` (new)

A Server Component, following the same pattern as
`financial-check/page.tsx` (Slice 3.5): a back-link to the project, a header,
then the feed. A Stage filter is a row of pill links (`?stage={stageId}` /
no query for "All stages") rather than a client-side dropdown — consistent
with this app's existing preference for plain `<Link>`-driven navigation
state over client components where a full page already re-renders cheaply.
Each row shows the `summary`, the owning Stage's name, and the date
(`formatDate` from `@/lib/format`, the shared "06 Sep 2026" formatter), and
links to `href`.

### Nav entry

`src/app/(app)/projects/[id]/page.tsx` — one new secondary "Activity
history" button in the project header's action row, next to "Funding
requests" (same row/pattern as "Material stock" / "Purchase orders" /
"Funding requests").

## Guideline §40 fields represented / not represented

Per ticket 05's own framing, this is **explicitly narrower** than a literal
§40 audit trail. What §40 asks for, and this slice's answer:

| §40 field | Represented? | How |
|---|---|---|
| Event (what happened) | Yes | `summary`, composed from the record's own status/lifecycle columns |
| Record type | Yes | `recordType` |
| Record ID | Yes | `recordId` (+ `href` to the actual record) |
| Timestamp | Yes | `occurredAt`, off the record's own `created_at`/lifecycle timestamp column |
| **Previous value → New value** (e.g. "TZS 850,000 → TZS 875,000") | **No** | Not reproducible from status/timestamp columns alone — no before/after snapshot exists anywhere in the schema. This is the ticket's own named gap. |
| **Reason** | **No** | No `reason`/free-text capture exists on any write path for this purpose; nothing was added to any form. (Note: `variations.reason`, `purchase_orders.cancel_reason`, `funding_requests.revision_reason`/`cancel_reason`, `delivery_records.over_delivery_reason`, `payment_records.over_payment_reason` already exist as domain-specific fields on their own tables for unrelated purposes — none of these is a generic audit "reason," and none was touched.) |

Both gaps are the ticket's explicit, recorded trade-off, not something
silently dropped here.

### A further honesty gap, found while building (not in the ticket's own list)

Ticket 05 lists Stage's full status enum (`planned/active/awaiting_funding/
on_hold/ready_for_closeout/completed/cancelled`) as a signal source. Reading
`stages.ts`'s schema (and `tasks.ts`'s, which has the same shape) shows only
two dated columns exist per row: `started_on` and `completed_on` — both
Engineer-editable form fields (see `structure.ts`'s `createStage`/
`updateStage`), not timestamps auto-stamped on a status transition. There is
**no dedicated timestamp for `awaiting_funding`, `on_hold`,
`ready_for_closeout`, or `cancelled`** on either Stage or Task (Task has the
same gap for `on_hold`/`cancelled`).

Rather than approximate those four transitions off `updated_at` — which
changes on *any* edit to the row, not just a status change, and would
misattribute unrelated edits as status-change events — this build emits
**no** event for those four Stage statuses (and Task's `on_hold`/
`cancelled`). Only `created`, and `started`/`completed` when their date
field happens to be filled in, are emitted for Stage/Task. This is the same
"an honest gap beats a fabricated signal" principle the ticket itself uses
to justify skipping the previous-value/reason fields — applied one level
deeper, to a case the ticket's own summary didn't spell out. If a Stage
sits in `on_hold` for three weeks, that fact is visible on the Stage's own
status badge everywhere else in the app; it just doesn't get its own
Activity row with a "when" attached, because there is genuinely no "when"
recorded anywhere in this schema for that transition.

## Deviations from the ticket's prose

- **No `claimDocumentNumber` / minting-event query.** The ticket frames
  "the numbered-document minting events (`FR-`, `PO-`, `VO-` etc.)" as one
  of the signal sources. In practice, minting always happens in the same
  DAL transaction as the status write that also sets a dated lifecycle
  column (`issuedAt` for Funding Requests, `orderedAt` for Purchase Orders,
  `approvedAt` for Variations — see `variations.ts`'s `approveVariation`,
  `funding.ts`'s issue path, `procurement.ts`'s issue path). So the
  "ordered"/"issued"/"approved" status-change event *is* the minting event
  — reading `display_number` off the same row at that event gives the
  minted number for free, with no separate query against
  `document_numbers`/`claimDocumentNumber`'s bookkeeping needed.
- **`SCR-` (Stage Closeout Report, ticket 03/Slice 4.2) not included.**
  Per the build brief, ticket 03's Stage Closeout Report is being built
  concurrently in a sibling worktree and is not present in this worktree
  (this worktree was fast-forwarded only to `1ef906b`, the Phase 4 map +
  schema-ledger commit — no Slice 4.1–4.3 code has landed here). Per the
  ticket's own "optional/best-effort" framing for this signal, no attempt
  was made to guess at its shape. If/when it lands, it is one more
  `tx.execute` block of the same shape as `purchaseOrderEvents`/
  `fundingRequestEvents` above — the module's per-table-function structure
  is built to make that a small, additive follow-up, not a rework.
- **Deposit/Payment/Delivery events link to their parent record, not a
  standalone page.** None of these three tables has its own detail screen
  in this codebase (deposits show inside the Funding Request page,
  payments/deliveries inside the Purchase Order page) — `href` reflects
  that, same as the Reconciliation Engine's own findings do for the same
  three record types.
- **Stage filter is a plain link row (`?stage=`), not a `<select>`.** No
  ticket text specified a UI mechanism; this keeps the page a pure Server
  Component with no client-side state, matching every other list/filter
  screen already in the app.

## Interface for any future caller

- **`getProjectActivity(projectId, options?: { stageId?: string }):
  Promise<ActivityEvent[]>`** (`src/lib/data/activity.ts`, barrel-exported
  from `@/lib/data`) — the one entry point.
- **`ActivityEvent` / `ActivityRecordType`** — safe types for a future
  screen (e.g. a per-stage activity widget, or folding a slice of this feed
  into a dashboard) to reuse without a second query shape.
- Adding a tenth source table (e.g. once ticket 01's Site Diary or ticket
  02's Photos land) means one more `xEvents(tx, projectId, stageId)`
  function following the same shape, added to the `Promise.all` list in
  `getProjectActivity` — no change to the return type or the screen.

## Verify

```bash
cd web
npm run typecheck   # clean — `next typegen && tsc --noEmit`, exit 0
npm run lint        # clean — exit 0, full project
```

Also ran a targeted `npx eslint` against just the four changed/new files
(`src/lib/data/activity.ts`, `src/lib/data/index.ts`,
`src/app/(app)/projects/[id]/activity/page.tsx`,
`src/app/(app)/projects/[id]/page.tsx`) — clean.

No migration generated or needed (no schema change — see "Schema" above).
`db:migrate` / `npm test` / `npm run build` were **not** run in this
worktree (no `DATABASE_URL`/Testcontainers setup attempted here) — left for
CI on the eventual PR, same as every other slice's runbook notes before its
CI run.

## Open questions / follow-ups for integration

1. **Stage/Task status-change gap** (see above): `awaiting_funding`/
   `on_hold`/`ready_for_closeout`/Stage-`cancelled` and Task-`on_hold`/
   `cancelled` have no dated event in the feed today, because no dated
   column exists for them. If this ever needs closing, it is schema work
   (a `status_changed_at` column or similar) — explicitly out of this
   ticket's "no schema changes" constraint, so flagged here rather than
   worked around with a guess.
2. **SCR-/Photos/Site Diary signals** are not wired in yet, pending those
   sibling slices landing on this branch — see "Deviations" above for the
   easy follow-up shape.
3. No merge conflicts expected against the other four Phase 4 slices per
   the build brief (this slice touches no schema barrel, no
   `web/src/lib/documents/`) — confirmed: the only files touched are new
   (`activity.ts`, `activity/page.tsx`) or small additive edits to
   `data/index.ts` (one export line) and the project overview page (one
   nav button).
