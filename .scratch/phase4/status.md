# Phase 4 — build status

Decisions: `.scratch/phase4/map.md` (7 tickets, all resolved). Same
environment constraint as every prior phase (`.scratch/phase3/status.md`):
`web/node_modules` is Windows-built, so only `tsc`/`eslint` run in WSL —
`db:migrate`, `npm test`, `npm run build` verification goes through CI's own
throwaway Postgres (a migration is generated via the isolated-Linux-
drizzle-kit scratch procedure, diffed against the previous snapshot for
drift, then hand-appended with the standard RLS block — never applied
locally). Land and verify each migration before building the DAL on top of
it.

Branch: `phase4-site-history-reporting`.

## Why this order / this parallelization

Five slices, four of them structurally independent of each other and built
**simultaneously by separate subagents in isolated git worktrees**, then
integrated onto the shared branch one at a time (sequential integration,
parallel authoring):

- **4.1 (Site Diary + Progress Photos)** bundles tickets 01+02 into one
  slice rather than two, because `photos.site_diary_entry_id` FKs into
  `site_diary_entries` — the two tables must land in the same migration.
- **4.2 (Stage Closeout Report)** and **4.3 (Project Closeout)** both add a
  new, independent variant to the existing `DocumentSnapshot` union
  (`src/lib/data/schema/snapshot.ts`) and `DocumentInput` union
  (`src/lib/data/documents.ts`) — additive cases, not edits to each other's
  code, so they don't need to be sequenced against each other the way
  ticket 04's original "03 before 04" note assumed (superseded once build
  planning found `projects.status` already exists — see 4.3's runbook).
  Both do share those two union files as an integration point: expect a
  trivial "both added a case" merge, not a logical conflict.
- **4.4 (Comprehensive Activity History)** and **4.5 (Advanced Reporting
  Dashboard)** touch no schema and no shared module — pure new read-only
  routes over already-existing data. Zero integration risk with anything.

Integration order (least to most shared-file risk): 4.4, 4.5, 4.1, then
4.2 + 4.3 together (both touch `snapshot.ts`/`documents.ts` — merged and
typechecked as a pair). Each slice is pushed to the branch immediately
after integration and checked against CI before the next is folded in, per
this repo's standing "verify before building on top of it" rule — even
though the code was written in parallel, verification stays sequential.

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 4.1 | **Site Diary + Progress Photos** (tickets 01, 02) — `site_diary_entries` + `photos` tables in one migration, DAL, per-Stage diary entry screens, inline photo upload/strip component reused across every `photos` target. | Dispatched to subagent. |
| 4.2 | **Stage Closeout Report** (ticket 03) — extends `closeStage` to freeze a `stage_closeout_report` snapshot; new `DocumentSnapshot`/`DocumentInput` variant + HTML template; PDF/JPG via the existing renderer. | Dispatched to subagent. |
| 4.3 | **Project Closeout** (ticket 04) — `completeProject`/`archiveProject` Server Actions gated on every Stage `completed`; reuses the *already-existing* `projects.status`/`completed_on` columns (no new column); new `DocumentSnapshot`/`DocumentInput` variant + HTML template. | Dispatched to subagent. |
| 4.4 | **Comprehensive Activity History** (ticket 05) — derived, read-only chronological feed per Project (filterable per Stage) from existing `created_at`/status-change signals. No migration. | Dispatched to subagent. |
| 4.5 | **Advanced Reporting Dashboard** (ticket 06) — six live per-project report screens (Project Financial Summary, Material Cost, Procurement, Labour, Funding, Variation). No migration, no PDF/JPG. | Dispatched to subagent. |

## Out of scope for this build

Ticket 07's two scope-closing decisions (Phase 4 is the final roadmap
phase; Supplier/Subcontractor Statement PDF/JPG export closed permanently)
need no build — they're records, not code.
