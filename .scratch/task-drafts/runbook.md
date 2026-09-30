# Task-sourced drafts — runbook

Every Task save now keeps **one draft Funding Request** (its materials +
labour) and **one planned Purchase Order** (its materials, supplier blank) in
step with the Task. Decisions (2026-09-30): one FR per task; one PO per task
with the supplier chosen before Issue; the stage's first FR is `base`, every
later task's FR is `additional`.

## Schema — migration `0015_task_sourced_drafts`

Generated with `drizzle-kit generate` (it now runs in WSL):

```sql
ALTER TABLE "funding_requests" ADD COLUMN "source_task_id" uuid;
ALTER TABLE "purchase_orders" ADD COLUMN "source_task_id" uuid;
```

Loose columns (no FK), the same posture as `tasks.subcontractor_id`. No RLS
change — both tables already carry `app.enable_standard_rls`.

## Not yet run — needs a database (Windows side or CI)

1. `npm run db:migrate` — applies `0015` (and the uncommitted `0014`).
2. `npm test` — the full suite, including the isolation/conformance sweep.
3. `npm run build`.
4. Manual pass:
   - Add a task with 2 material lines + a labour amount → Funding shows a
     draft **base** FR with 2 material lines + 1 labour line; Procurement
     shows a planned PO with 2 lines and "Supplier not chosen".
   - Edit the task's quantities → both drafts follow.
   - Draw some material from stock on the task → FR and PO ask for the
     shortfall only.
   - Issue the PO without a supplier → refused ("Choose a supplier…"); pick
     a supplier on Edit, save, issue → OK. Further task edits leave it alone.
   - Add a second task in the same stage → its FR is **additional**.
   - Fixed-fee stage: issue both FRs → only the first raises a Fee Invoice;
     the second's fee line reads 0 ("Already billed…").
   - Delete a task → its still-draft FR / planned PO go; issued ones stay.

## Code map

- `web/src/lib/task-drafts.ts` — pure line builder (tests:
  `web/tests/financials/task-drafts.test.ts`).
- `web/src/lib/data/task-drafts.ts` — `syncTaskDrafts` / `discardTaskDrafts`
  (called inside `createTask` / `updateTask` / `deleteTask` transactions),
  `getTaskSourcedDocumentIds`.
- `web/src/lib/data/funding.ts` — `issueFundingRequest` fixed-fee guard.
- `web/src/lib/data/procurement.ts` — a planned PO may have no supplier.
- UI: `TaskSourceNote` on both draft edit pages; `LinkedDocumentsCard` on the
  task edit page.

## Known limits

- Existing tasks get drafts on their next save (no backfill).
- Lines trimmed by hand on a task-sourced draft come back on the next task
  save — the note on the draft says to change them on the task.
