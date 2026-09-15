# Comprehensive Activity History

Type: grilling
Status: resolved

## Question

Guidelines §40 wants a full Audit Trail: every financial record change
logged with event, record type, record ID, previous value, new value,
timestamp, and reason where applicable — "financial records must never
disappear silently." §50 already has an `audit_events` table shape, but
nothing under `web/src/` writes to or reads from it; a repo-wide grep
confirms it has never been built. §60 item 5 ("Comprehensive activity
history") is Phase 4's version of the same idea. Building §40 literally
means instrumenting **every** mutation across every DAL function (Projects,
Stages, Tasks, Funding Requests, POs, Deposits, Payments, Variations,
Material Lines, Stage Closeout, Photos, Site Diary — dozens of write paths)
to capture before/after JSON and a reason. Is that the Phase 4 scope, or
something narrower?

## Answer

**Narrower: a derived, read-only Activity feed, not a write-interception
audit log.** A literal §40 retrofit — wrapping every existing write path in
every DAL module to snapshot old/new values — is a large, cross-cutting
change to code that Phase 1–3 already built and CI-verified, with real risk
of missing a path or subtly changing transaction semantics along the way,
for a feature the guidelines themselves frame as historical visibility
("financial records must never disappear silently"), which §41's own
Void/Cancel/Supersede/Archive discipline (never hard-delete) already
substantially delivers without any audit table at all.

Instead: **assemble the feed live from data the app already has.** Every
record with a real lifecycle already carries the signal an activity feed
needs — `created_at`, `status` columns (Variation
draft/approved/rejected/cancelled, PO ordered/cancelled/closed, Funding
Request draft/issued/superseded), and the numbered-document minting events
(`FR-`, `PO-`, `VO-` etc.) — so the feed is a query that unions "record
created" and "status changed to X" events across every table that has a
status column or a `claimDocumentNumber` call, ordered by timestamp, shown
per-Project (and per-Stage, filtered) as a simple chronological list: date,
what happened, link to the record. This is a `Reconciliation
Engine`-style precedent — "compute live from existing data, don't build new
storage" — applied to history instead of validation.

**Explicitly less than §40's literal ask**, and that gap is recorded, not
silently dropped: no field-level previous-value/new-value diff (e.g. "TZS
850,000 → TZS 875,000" from §40's own example is not reproducible this
way — only "expected cost was changed" is), and no free-text "Reason"
capture on any existing write path. A true audit-log retrofit — adding a
`reason` field to relevant forms and a real `audit_events` write on every
mutation — is flagged as a genuine future effort if the supervisor ever
needs to answer "who changed this figure and why," not built now.

### Consequences for the spec

- No `audit_events` table, no new write-path instrumentation anywhere.
- New read-only query/screen per Project (and filtered per Stage) that
  unions existing `created_at`/status-change signals into one chronological
  list — no migration needed beyond whatever ticket 01–04 already add.
- If a future need for real before/after diffing emerges, it's a separate,
  explicitly-scoped effort — not silently expanded into this ticket.
