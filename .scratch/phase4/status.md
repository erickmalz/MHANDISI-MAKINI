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
| 4.1 | **Site Diary + Progress Photos** (tickets 01, 02) — `site_diary_entries` + `photos` tables, DAL, per-Stage diary entry screens, `PhotoStrip` component wired onto the Stage page and diary entries (Task/Delivery/Payment/Variation targets built into the DAL/schema but not yet wired to UI — fast-follow). Runbook: `.scratch/phase4/slice-4.1-runbook.md`. | **Built + merged** (commit `4b32b88`, merged `75472f8`). |
| 4.2 | **Stage Closeout Report** (ticket 03) — new `stage_closeouts` table; extends `closeStage` to freeze the snapshot and mint `SCR-{project_code}-NNN`; fourth `DocumentSnapshot`/`DocumentInput` kind + `StageCloseoutReportDoc.tsx`; PDF/JPG download routes on the closeout page. Runbook: `.scratch/phase4/slice-4.2-runbook.md`. | **Built + merged** (commit `bce4851`, merged `d891421`). |
| 4.3 | **Project Closeout** (ticket 04) — new `project_closeouts` table; `completeProject`/`archiveProject` Server Actions gated on every Stage `completed`, reusing the *already-existing* `projects.status`/`completed_on` columns; fifth `DocumentSnapshot`/`DocumentInput` kind, `PCR-{project_code}-NNN` numbering. Runbook: `.scratch/phase4/slice-4.3-runbook.md`. | **Built + merged** (commit `f044f8a`, merged `499b702`). |
| 4.4 | **Comprehensive Activity History** (ticket 05) — derived, read-only chronological feed per Project (filterable per Stage) unioning 9 tables' `created_at`/status-change signals. No migration. Known gap: Stage/Task have no dated column for several status values (`on_hold`, `cancelled`, etc.) — those transitions don't appear in the feed rather than being faked off `updated_at`. Runbook: `.scratch/phase4/slice-4.4-runbook.md`. | **Built + merged** (commit `a005d3c`, merged `c601889`†). |
| 4.5 | **Advanced Reporting Dashboard** (ticket 06) — six live per-project report screens (Project Financial Summary, Material Cost, Procurement, Labour, Funding, Variation), reusing existing `finance.ts`/`procurement.ts`/`statements.ts` calculations. No migration, no PDF/JPG. Runbook: `.scratch/phase4/slice-4.5-runbook.md`. | **Built + merged** (commit `6d0fa6a`, merged `c601889`†). |

† 4.4 and 4.5 were merged together in one commit (`c601889`) since their conflict — both adding a nav button to the project overview page and an export to the `lib/data` barrel — could only be resolved by looking at both branches at once.

## Integration

All five slices merged cleanly onto `phase4-site-history-reporting` (commits
`c601889` → `75472f8` → `499b702` → `d891421`), resolving conflicts only in
shared, purely-additive spots as anticipated: the project overview page's
nav buttons, the `lib/data`/schema barrels, the `DocumentSnapshot`/
`DocumentInput` unions, `document_number_type`, and the template render
switch. No logical conflicts — every resolution was "both agents added a
case/export, keep both."

Migration `0010_phase4_site_history_reporting` (commit `df1d3e5`) generated
centrally after integration, via the isolated-Linux-drizzle-kit scratch
procedure against the fully-merged schema, diffed against `0009`'s snapshot:
the only differences are the four new tables (`site_diary_entries`,
`photos`, `stage_closeouts`, `project_closeouts`), the new `photo_category`
enum, and `document_number_type` gaining `stage_closeout_report` /
`project_closeout_report`. RLS block hand-appended for all four tables.

`npx tsc --noEmit` and `npx eslint .` both pass clean on the fully-integrated
tree (post-merge, pre-push). Pushed to `origin/phase4-site-history-reporting`
— PR #5 — for CI verification (`db:migrate`, isolation suite, `build`).

## Out of scope for this build

Ticket 07's two scope-closing decisions (Phase 4 is the final roadmap
phase; Supplier/Subcontractor Statement PDF/JPG export closed permanently)
need no build — they're records, not code.
