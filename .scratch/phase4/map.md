# Phase 4 — Site History & Reporting — Decision Map

Wayfinder decision map. Tracker: local markdown (`.scratch/phase4/`). Started 2026-09-15.

## Destination

Lock every product/business decision needed to build Phase 4 (guidelines
§60, "Site History & Reporting") — the final roadmap phase — on top of the
now-complete Phase 1 (Financial Backbone), multi-tenancy rebuild, Operational
Control, and Phase 3 (Change & Forecast Control, PR #4) builds: Site Diary,
Progress-Photo Timeline, Stage Closeout Reports, Project Closeout,
Comprehensive Activity History, and the Advanced Reporting Dashboard.
Reaching the end means every ticket below has a recorded answer, so the
build can start without guessing at mechanics the guidelines doc left open.
**This map produces decisions, not code** — same discipline as
`.scratch/phase1-decisions/`, `.scratch/multi-tenancy/`,
`.scratch/operational-control/`, and `.scratch/phase3/`.

## Notes

- **Domain / prior spec**: `construction-supervision-app-expanded-guidelines.md`
  §30 (Site Diary), §31 (Progress Photos), §37 (Project Closeout), §38
  (Reports), §39 (Dashboard Reporting), §40 (Audit Trail), §60 (Phase 4 item
  list); `CONTEXT.md` (glossary); the resolved `.scratch/phase3/map.md`
  (esp. issue 07's Phase 3/4 boundary, which this map inherits directly) and
  `.scratch/multi-tenancy/issues/01-what-an-account-owns.md` (which first put
  Site Diary/Progress Photos out of scope) and
  `.scratch/operational-control/map.md` decisions 1 (Document attachments)
  and 5 (Supplier/Subcontractor Statements, incl. the deferred PDF/JPG
  thread this map closes in ticket 07).
- **Build state this map is written against**: Phase 1, multi-tenancy,
  Operational Control, and Phase 3 are all fully built and CI-verified (PR
  #4 merged). In particular: the `attachments` table (one proof file per
  financial record, Operational Control Slice 4), the issued-document
  rendering module (`web/src/lib/documents/`, PDF+JPG, frozen
  `document_snapshot` only — three `DocumentInput` kinds today:
  `funding_request`, `fee_invoice`, `purchase_order`), Stage Closeout as a
  plain `stages.status = 'completed'` flip with **no** `stage_closeouts`
  table (Phase 3 decision 5), the Financial Reconciliation Engine's
  live-compute-nothing-stored precedent, and the Choose Project page's own
  shipped rule — "never shows project figures side by side" — confirmed
  directly in `web/src/app/(app)/page.tsx`. Every ticket below is scoped
  against what already exists so it doesn't re-decide or re-build it.
- **Decision-maker**: the user answers every ticket personally, as the
  engineer who will use and run the product — resolved in this session by
  running the `grilling` design-tree method against the codebase/spec and
  **taking the firm recommendation on each frontier round as the decision**,
  per the user's explicit instruction and standing preference on this kind
  of ticket (see the memory `mhandisi-makini-grilling-accept-recommendations`).
  No round was left open for a second pass.
- **Every ticket is `grilling`** unless noted otherwise.
- **This map plans, it does not build.** The DDL, DAL, Server Actions and
  screens are a downstream build effort, tracked the way `phase2/status.md`,
  `operational-control/status.md`, and `phase3/status.md` track their
  slices — a `.scratch/phase4/status.md` follows once building starts.

## Tickets

1. [Site Diary](./issues/01-site-diary.md)
2. [Progress Photos & attachment-model unification](./issues/02-progress-photos-and-attachment-model.md)
3. [Stage Closeout Report](./issues/03-stage-closeout-report.md)
4. [Project Closeout](./issues/04-project-closeout.md)
5. [Comprehensive Activity History](./issues/05-comprehensive-activity-history.md)
6. [Advanced Reporting Dashboard](./issues/06-advanced-reporting-dashboard.md)
7. [Phase 4 scope boundaries](./issues/07-phase4-scope-boundaries.md)

## Decisions so far

- [Site Diary](./issues/01-site-diary.md): One entry per Project+Stage+Date
  holding the §30 field list as plain columns, nothing mandatory beyond
  Project/Stage/Date, edit-in-place (not append-only — a low-stakes
  narrative record, not a financial one). **No Stage Closeout gate** — stays
  purely informational, matching the guideline's own "not a full inspection
  system" caveat. The "Photos" field is not a column here; it's `photos`
  rows (ticket 02) targeting the entry.
- [Progress Photos & attachment-model unification](./issues/02-progress-photos-and-attachment-model.md):
  New `photos` table, **not** a reuse of `attachments` — `attachments`'s
  one-proof-file-per-record `UNIQUE` cap is load-bearing for its own feature
  and stays untouched. `photos` has seven nullable target FKs (Project,
  Stage, Task, Site Diary Entry, Delivery, Payment Record — covering both
  "Purchase delivery" and "Receipt" — Variation), no per-target cap, plus
  category/caption/GPS/`captured_on`. The eighth §31 target, "Stage
  Closeout," is just a Stage-targeted photo tagged `category = 'closeout'`
  — there's no `stage_closeouts` row to attach to.
- [Stage Closeout Report](./issues/03-stage-closeout-report.md): Reuses the
  existing PDF/JPG document-rendering module as a fourth `DocumentInput`
  kind, `stage_closeout_report`. The existing `closeStage` transaction is
  extended to freeze a `document_snapshot`-shaped blob at the moment of
  closing (mirroring Funding Request's freeze-at-Issue) — Close Stage *is*
  issuing the report, no separate action. Stages closed before this ships
  show "Report not available."
- [Project Closeout](./issues/04-project-closeout.md): New
  `projects.status` (`active | completed | archived`). **Complete Project**
  gated on every Stage already `completed` (mirroring Stage Closeout's own
  hard-gate philosophy); freezes a fifth `DocumentInput` kind,
  `project_closeout_report`, assembled by summing already-computed
  per-stage/per-project figures — no new financial engine. **Archived** is a
  later, separate, ungated status flip with no new snapshot and no
  un-archive flow designed now.
- [Comprehensive Activity History](./issues/05-comprehensive-activity-history.md):
  **No** literal §40 audit log (`audit_events` table + before/after diffing
  on every mutation) — too large a retrofit across every already-built DAL
  path for what the guideline's own framing needs. Instead a derived,
  read-only Activity feed assembled live from existing `created_at`/status-
  change signals across every record with a lifecycle, same
  "compute-live-don't-store" precedent as the Reconciliation Engine.
  Explicitly narrower than §40 (no field-level old/new diff, no "Reason"
  capture) — recorded as a real future effort if ever needed, not silently
  dropped.
- [Advanced Reporting Dashboard](./issues/06-advanced-reporting-dashboard.md):
  Builds the six §38 reports not already shipped (Project Financial
  Summary, Material Cost, Procurement, Labour, Funding, Variation) as live,
  read-only, **per-project** screens — presentation over already-computed
  figures, no PDF/JPG (they're analytical views, not issued records, same
  class as the existing Supplier/Subcontractor Statements). **§39's
  cross-project aggregate dashboard is not built** — superseded by the
  already-shipped, explicitly-documented one-project-at-a-time rule on the
  Choose Project page, not merely descoped.
- [Phase 4 scope boundaries](./issues/07-phase4-scope-boundaries.md):
  Confirmed Phase 4 is the roadmap's final phase (§61 is a permanent
  exclusion list, not a Phase 5). Operational Control's deferred Supplier/
  Subcontractor Statement PDF/JPG "fast-follow" is **closed permanently, not
  just deferred** — ticket 06 already classified Statements as inherently
  live views incompatible with a frozen-snapshot export.

## Out of scope

- **Reopening any Phase 1 financial decision, the multi-tenancy model, the
  one-project-at-a-time UX, or any already-built Phase 2 / Operational
  Control / Phase 3 slice's mechanics** — this map only decides genuinely
  new Phase 4 ground.
- **§39's cross-project aggregate dashboard** — settled in ticket 06 as
  permanently superseded by the shipped Choose Project page rule, not a
  deferred item.
- **A literal §40 audit-log retrofit** (field-level diffing, write-path
  instrumentation) — settled in ticket 05 as a genuinely separate future
  effort, not Phase 4 scope.
- **Supplier/Subcontractor Statement PDF/JPG export** — settled in ticket 07
  as permanently closed, not deferred.
- **Column-by-column DDL, DAL signatures, Server Actions, and screens** —
  the build that follows this map, tracked in a new
  `.scratch/phase4/status.md` once the map is resolved (same split as every
  prior map).
- **Anything beyond guidelines §57–§61** — confirmed in ticket 07 that
  nothing follows Phase 4 in the roadmap.

## Status

**Complete.** All 7 tickets (01–07) are resolved, cross-checked against
each other (ticket 01 depends on 02 for photo storage; 04 depends on 03's
rendering-module extension pattern; 06 and 07 both rest on the same
one-project-at-a-time precedent and both classify Statements as
frozen-snapshot-incompatible — no contradictions found) and consistent with
every already-resolved Phase 1 / multi-tenancy / Operational Control /
Phase 3 decision. The guidelines doc plus this map's seven resolved issues
together are the build-ready spec for Phase 4 — the final phase of the
roadmap.
