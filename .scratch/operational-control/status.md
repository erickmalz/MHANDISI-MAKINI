# Operational Control — build status

Decisions: `.scratch/operational-control/map.md`. Same environment constraint
as Phase 2 (`.scratch/phase2/status.md`): `web/node_modules` is Windows-built,
so only `tsc`/`eslint` run in WSL — `db:migrate`, `npm test`, `npm run build`
verification goes through CI's own throwaway Postgres (confirmed working,
Slice 2.8).

_Last updated: session (2026-09-12). Slices 1-2 code-complete, `tsc`/`eslint`
clean in WSL; Slice 1 CI-green, Slice 2 pending push._

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Alerts extension — `computeStageAlerts` (new, query-based: material-not-ordered, PO overdue, partial delivery outstanding, delivered-but-unpaid, labour exceeds agreement, final-payment-on-incomplete-task, unallocated deposit) alongside the extended pure `deriveProjectAlerts` (float-below-upcoming-commitments, stage-complete-with-labour-outstanding). `ProjectAlert` gained an optional `href`; `AlertsList` links to the record. No schema change. | **Done + CI-green** (`15df06f`, run `34691793656`) |
| 2 | Budget revisions — Task labour: `labourOriginal` set once at creation, every later edit writes `labourRevised` instead (`tasks.ts`'s `updateTask`); locked (silently kept as-is) once the stage's Funding Request is issued/closed (`stageBudgetLocked`), with the edit form's amount field read-only + explanatory hint in that state, and the "Original: {value}" hint shown once a revision exists. Material Lines: no per-line original/revised split (delete-and-reinsert has no stable per-line identity — see map.md's scoping note); the whole take-off locks wholesale under the same condition instead of silently overwriting. `getTaskInput` gained `labourOriginalAmount` + `budgetLocked`. New task creation is **not** locked. No schema change. | **Done, pending push/CI** |
| 3 | Supplier / Subcontractor Statements — read-only in-app screens. No schema change. | Not started |
| 4 | Document attachments — new `attachments` table (bytea, polymorphic to Payment/PO/Labour Payment). Needs a migration. | Not started |
| 5 | Alerts follow-up — missing receipt / missing delivery note, now that attachments exist. | Not started |
| 6 | Stage templates — new `stage_templates` table (per-Account register). Needs a migration. | Not started |
