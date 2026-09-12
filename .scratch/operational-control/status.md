# Operational Control — build status

Decisions: `.scratch/operational-control/map.md`. Same environment constraint
as Phase 2 (`.scratch/phase2/status.md`): `web/node_modules` is Windows-built,
so only `tsc`/`eslint` run in WSL — `db:migrate`, `npm test`, `npm run build`
verification goes through CI's own throwaway Postgres (confirmed working,
Slice 2.8).

_Last updated: session (2026-09-12). Slice 1 (Alerts extension) code-complete,
`tsc`/`eslint` clean in WSL; CI verification pending push._

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Alerts extension — `computeStageAlerts` (new, query-based: material-not-ordered, PO overdue, partial delivery outstanding, delivered-but-unpaid, labour exceeds agreement, final-payment-on-incomplete-task, unallocated deposit) alongside the extended pure `deriveProjectAlerts` (float-below-upcoming-commitments, stage-complete-with-labour-outstanding). `ProjectAlert` gained an optional `href`; `AlertsList` links to the record. No schema change. | **Done, pending CI verification** |
| 2 | Budget revisions — wire `qty_revised`/`est_unit_cost_revised`/`labour_revised` into write DAL + forms + projection; lock after Stage's FR is issued. No schema change. | Not started |
| 3 | Supplier / Subcontractor Statements — read-only in-app screens. No schema change. | Not started |
| 4 | Document attachments — new `attachments` table (bytea, polymorphic to Payment/PO/Labour Payment). Needs a migration. | Not started |
| 5 | Alerts follow-up — missing receipt / missing delivery note, now that attachments exist. | Not started |
| 6 | Stage templates — new `stage_templates` table (per-Account register). Needs a migration. | Not started |
