# Operational Control — build status

Decisions: `.scratch/operational-control/map.md`. Same environment constraint
as Phase 2 (`.scratch/phase2/status.md`): `web/node_modules` is Windows-built,
so only `tsc`/`eslint` run in WSL — `db:migrate`, `npm test`, `npm run build`
verification goes through CI's own throwaway Postgres (confirmed working,
Slice 2.8).

_Last updated: session (2026-09-12). Slices 1-5 code-complete, `tsc`/`eslint`
clean in WSL; Slices 1-3 confirmed CI-green, Slices 4-5 pushed and pending
their CI run (check before treating them as landed — see each slice's
commit). **Slice 6 (Stage templates) is the next slice, not yet started** —
a fresh session should read this file + `map.md` decision 2 first, then
follow the same pattern as Slice 4: design the `stage_templates` table
(one JSONB column holding the whole `Stage → Task → typical Material Lines`
tree is very likely the right shape — no relational benefit to normalising
something that's only ever read/written wholesale — but confirm that call
holds before generating the migration), generate it via the isolated
Linux-`drizzle-kit` approach in a scratch directory (`web/node_modules` is
Windows-built and can't run it under WSL — see Slice 4/5's migration commit
for the exact steps), diff its snapshot against `0006`'s to confirm zero
drift, then build the register CRUD + the "Create Project from template"
flow per decision 2's two authoring paths._

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Alerts extension — `computeStageAlerts` (new, query-based: material-not-ordered, PO overdue, partial delivery outstanding, delivered-but-unpaid, labour exceeds agreement, final-payment-on-incomplete-task, unallocated deposit) alongside the extended pure `deriveProjectAlerts` (float-below-upcoming-commitments, stage-complete-with-labour-outstanding). `ProjectAlert` gained an optional `href`; `AlertsList` links to the record. No schema change. | **Done + CI-green** (`15df06f`, run `34691793656`) |
| 2 | Budget revisions — Task labour: `labourOriginal` set once at creation, every later edit writes `labourRevised` instead (`tasks.ts`'s `updateTask`); locked (silently kept as-is) once the stage's Funding Request is issued/closed (`stageBudgetLocked`), with the edit form's amount field read-only + explanatory hint in that state, and the "Original: {value}" hint shown once a revision exists. Material Lines: no per-line original/revised split (delete-and-reinsert has no stable per-line identity — see map.md's scoping note); the whole take-off locks wholesale under the same condition instead of silently overwriting. `getTaskInput` gained `labourOriginalAmount` + `budgetLocked`. New task creation is **not** locked. No schema change. | **Done, pending push/CI** |
| 3 | Supplier / Subcontractor Statements — `src/lib/data/statements.ts` (`getSupplierStatement`/`getSubcontractorStatement`, account-wide, all-projects), new routes `/suppliers/[id]` and `/subcontractors/[id]` (linked from each register's row name), each order/task/payment links to its record. Variations line omitted per the map. No schema change. | **Done, pending push/CI** |
| 4 | Document attachments — `attachments` table (migration `0006_attachments`, generated via the same isolated-Linux-drizzle-kit approach as `0005`, diffed against `0005`'s snapshot to confirm only the new table changed), 3 nullable composite FKs (PO/Payment/Labour Payment) each capped at one via `UNIQUE`. DAL (`getAttachmentMeta`/`getAttachmentFile`/`setAttachment`) supports all 3 targets; **UI wired for Purchase Orders only** this slice (a new `AttachmentCard` at the page level, not inside the large existing `PurchaseOrderDetail` component) — Payment/Labour Payment upload widgets are a fast-follow, same DAL. ≤5MB, PDF/PNG/JPEG. Download route `/attachments/[attachmentId]`. | **Done, pending push/CI** |
| 5 | Alerts follow-up — "missing receipt" / "missing delivery note" now computable from Slice 4's attachments (both collapse to "no attachment on this PO," worded by whether it's delivered-only or delivered-and-paid, since there's one attachment slot per PO, not per delivery/payment). | **Done, pending push/CI** |
| 6 | Stage templates — new `stage_templates` table (per-Account register). Needs a migration. | Not started |
