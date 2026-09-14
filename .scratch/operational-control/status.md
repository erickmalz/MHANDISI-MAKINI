# Operational Control — build status

Decisions: `.scratch/operational-control/map.md`. Same environment constraint
as Phase 2 (`.scratch/phase2/status.md`): `web/node_modules` is Windows-built,
so only `tsc`/`eslint` run in WSL — `db:migrate`, `npm test`, `npm run build`
verification goes through CI's own throwaway Postgres (confirmed working,
Slice 2.8).

_Last updated: session (2026-09-14). Slices 1-5 done and CI-verified,
including migration `0006_attachments` applying cleanly on CI run
`34693498502` (`Apply migrations` / lint / typecheck / isolation suite /
build all green, commit `496cd1a`). **Slice 6 (Stage templates) is now
built, pending CI verification on push** — `stage_templates` (one JSONB
`body` column holding the `{ stages: [{ name, tasks: [{ description,
materialLines: [{ item, unit }] }] }] }` tree, per decision 2's call that
something only ever read/written wholesale doesn't benefit from
normalising), migration `0007_stage_templates` (generated via the isolated
Linux-`drizzle-kit` scratch-directory approach, `web/node_modules` still
can't run it under WSL; diffed against `0006`'s snapshot — zero drift beyond
the new table), the register DAL/validation/actions/CRUD pages at
`/stage-templates`, "Create Project from template" wired into `ProjectForm`
(a checklist to deselect stages/tasks, applied inside `createProject`'s own
transaction via `applyTemplateStages`), and "Save as template" on the
project page (`createTemplateFromProject`, reusing the same write path).
Unlike Suppliers/Subcontractors, a template supports a real delete — no
history depends on it once applied. `tsc --noEmit` and `eslint` both clean
in WSL. **Pushed and CI-verified**: PR #3 (`operational-control` branch),
CI run `34871803810` green (`Apply migrations` including `0007` / lint /
typecheck / isolation suite / `build`). This closes Operational Control's
build order — all 6 slices done._

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Alerts extension — `computeStageAlerts` (new, query-based: material-not-ordered, PO overdue, partial delivery outstanding, delivered-but-unpaid, labour exceeds agreement, final-payment-on-incomplete-task, unallocated deposit) alongside the extended pure `deriveProjectAlerts` (float-below-upcoming-commitments, stage-complete-with-labour-outstanding). `ProjectAlert` gained an optional `href`; `AlertsList` links to the record. No schema change. | **Done + CI-green** (`15df06f`, run `34691793656`) |
| 2 | Budget revisions — Task labour: `labourOriginal` set once at creation, every later edit writes `labourRevised` instead (`tasks.ts`'s `updateTask`); locked (silently kept as-is) once the stage's Funding Request is issued/closed (`stageBudgetLocked`), with the edit form's amount field read-only + explanatory hint in that state, and the "Original: {value}" hint shown once a revision exists. Material Lines: no per-line original/revised split (delete-and-reinsert has no stable per-line identity — see map.md's scoping note); the whole take-off locks wholesale under the same condition instead of silently overwriting. `getTaskInput` gained `labourOriginalAmount` + `budgetLocked`. New task creation is **not** locked. No schema change. | **Done + CI-green** (`117dce2`, run `34692220920`) |
| 3 | Supplier / Subcontractor Statements — `src/lib/data/statements.ts` (`getSupplierStatement`/`getSubcontractorStatement`, account-wide, all-projects), new routes `/suppliers/[id]` and `/subcontractors/[id]` (linked from each register's row name), each order/task/payment links to its record. Variations line omitted per the map. No schema change. | **Done + CI-green** (`5b3bf33`, run `34692760968`) |
| 4 | Document attachments — `attachments` table (migration `0006_attachments`, generated via the same isolated-Linux-drizzle-kit approach as `0005`, diffed against `0005`'s snapshot to confirm only the new table changed), 3 nullable composite FKs (PO/Payment/Labour Payment) each capped at one via `UNIQUE`. DAL (`getAttachmentMeta`/`getAttachmentFile`/`setAttachment`) supports all 3 targets; **UI wired for Purchase Orders only** this slice (a new `AttachmentCard` at the page level, not inside the large existing `PurchaseOrderDetail` component) — Payment/Labour Payment upload widgets are a fast-follow, same DAL. ≤5MB, PDF/PNG/JPEG. Download route `/attachments/[attachmentId]`. | **Done + CI-green** (`496cd1a`, run `34693498502`) |
| 5 | Alerts follow-up — "missing receipt" / "missing delivery note" now computable from Slice 4's attachments (both collapse to "no attachment on this PO," worded by whether it's delivered-only or delivered-and-paid, since there's one attachment slot per PO, not per delivery/payment). | **Done + CI-green** (`496cd1a`, run `34693498502`) |
| 6 | Stage templates — `stage_templates` register (migration `0007`), `Stage → Task → Material Line` tree (names/units only), register CRUD at `/stage-templates`, "Create Project from template" (deselect stages/tasks on `ProjectForm`) and "Save as template" from an existing project. | **Done + CI-green** (`71d9519`, PR #3, run `34871803810`) |
