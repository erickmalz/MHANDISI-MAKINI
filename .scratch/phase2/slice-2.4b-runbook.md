# Slice 2.4b — Tasks, reference registers & Material Take-Off — runbook

> **Pulled ahead of 2.6.** A Purchase Order names a Supplier from the per-Account
> register (CONTEXT.md), and `purchase_orders` has only a nullable `supplier_id`
> loose FK and no free-text supplier column — so 2.6 cannot capture a supplier
> until the Supplier Register exists. 2.4b builds it (plus the rest of the
> structure CRUD the ledger always had queued here), then 2.6 follows.

**No migration in this slice.** `tasks`, `suppliers`, `subcontractors` and
`material_lines` (and every column this slice writes) landed in
`0002_domain_structure` with Slice 2.1. 2.4b is pure TypeScript on top —
`npm run typecheck` (`next typegen && tsc --noEmit`) and `eslint` pass in WSL.
Only `npm run build` / `npm test` need the Windows side / CI.

## What changed

One commit on `phase2-domain-structure`, in two parts:

### Part 1 — the reference registers

The per-Account Supplier Register (guidelines §25) and Subcontractor Register
(§26). Both are plain directories reused across every project; the rich
purchase-history profile (§25 "Total orders / purchases / paid / outstanding")
is derived from PO data and comes with that lifecycle. **No delete** — a retired
row is marked `inactive` (a supplier/subcontractor with history must stay
referenceable behind the loose `supplier_id` / `subcontractor_id` columns).

- `src/lib/registers.ts` **(new)** — pure view-model types (`Supplier`,
  `Subcontractor`, `PartyStatus`). Safe for client import.
- `src/lib/validation/registers.ts` **(new)** — isomorphic Zod
  (`supplierInputSchema`, `subcontractorInputSchema`). `party_status` literals
  mirror the `pgEnum`.
- `src/lib/data/registers.ts` **(new)** — `listSuppliers` / `getSupplierInput` /
  `createSupplier` / `updateSupplier` and the four subcontractor equivalents.
  `withAccount` + RLS, no `accountId` in any signature; list orders
  active-before-inactive then by name.
- `src/lib/data/index.ts` — barrel re-exports the 8 register functions.
- `src/app/actions/{suppliers,subcontractors}.ts` **(new)** — create / update
  Server Actions, `ActionState`, `revalidatePath` + `redirect`; id as a bound
  arg.
- `src/app/(app)/suppliers/_components/SupplierForm.tsx`,
  `src/app/(app)/subcontractors/_components/SubcontractorForm.tsx` **(new)** —
  client forms on `useActionState`, `noValidate`.
- Routes **(new)**: `/suppliers`, `/suppliers/new`, `/suppliers/[id]/edit`;
  `/subcontractors`, `/subcontractors/new`, `/subcontractors/[id]/edit`.
- `src/app/(app)/page.tsx` — a "Reference registers" section on the project
  picker (the account home) linking to both registers.

### Part 2 — Tasks + Material Take-Off

A Task is a unit of work in a Stage, assigned one Subcontractor (Phase 1
decision 05). Its labour agreement lives on the Task (`labour_original`); the
unpaid remainder already feeds Open Labour Commitments in the 2.2 projection —
**no `computeStageFinancials` change** (creating a task with a labour amount
moves `openLabourCommitments` / `remainingLabour`, which is correct — a signed
Labour Agreement reduces float). Material Take-Off lines under a Task carry the
Engineer's estimate; they are **not** part of the float calc (they feed Material
Variance at closeout and pre-fill POs). Only the `*_original` estimate columns
are written — the §17 approved-estimate revision chain stays deferred.

- `src/lib/tasks.ts` **(new)** — `Task` / `MaterialTakeOffLine` view models,
  `TaskStatus`, pure helpers (`lineEstimate`, `estimatedMaterialCost`,
  `taskStatusLabel`). `labourAmount = labour_revised ?? labour_original`.
- `src/lib/validation/tasks.ts` **(new)** — isomorphic Zod. `takeOffLineSchema`
  (item + unit required, qty / est unit cost optional), `takeOffLinesSchema`
  (**may be empty** — a task can be created before its take-off),
  `taskInputSchema` (`subcontractorId` an optional UUID, `labourAmount` an
  optional whole amount). Take-off rows are posted as one JSON string in a
  hidden `lines` field, like the 2.5 funding builder.
- `src/lib/data/tasks.ts` **(new)** — `listTasksForStage` / `getStageDetail`
  (stage header + its tasks) / `getTaskInput` / `createTask` / `updateTask` /
  `deleteTask`. `withAccount` + RLS, no `accountId` in any signature. `seq` is
  `MAX(seq)+1` per stage. `subcontractor_id` stays a **loose column** (no
  composite FK — same call as `projects.current_stage_id`); the DAL asserts it
  targets a live subcontractor in the Account before writing. Take-off lines are
  delete-and-reinsert on edit. **`deleteTask` is refused** (`false`) when the
  Task has any Labour Payment — a task-delete cascade would take that history
  with it; `getTaskInput` returns `hasLabourPayments` so the edit page hides the
  delete button and says to set the task Cancelled instead.
- `src/lib/data/index.ts` — barrel re-exports the 6 task functions.
- `src/app/actions/tasks.ts` **(new)** — `createTaskAction` / `updateTaskAction`
  (ids bound) / `deleteTaskAction` (bare form action → redirect to the stage).
- `src/app/(app)/projects/_components/TaskForm.tsx` **(new)** — client form
  (shared by new + edit): task fields + a subcontractor `<select>` (active
  subcontractors; the edit route also includes the currently-assigned one even
  if now inactive) + a Material Take-Off `RowEditor` (rows in `useState`,
  serialized JSON in a hidden field).
- Routes **(new)**: `/projects/[id]/stages/[stageId]` (stage detail — its task
  list with per-task labour / material-estimate / progress),
  `/projects/[id]/stages/[stageId]/tasks/new`,
  `/projects/[id]/tasks/[taskId]/edit` (shallow — the task id resolves its
  stage; carries a Delete unless `hasLabourPayments`).
- `src/app/(app)/projects/[id]/_components/StageList.tsx` — a "Tasks" link per
  stage to the new stage-detail page.

## Verify (Windows / CI)

```powershell
cd web
npm run lint         # eslint — green in WSL already
npm run typecheck    # next typegen && tsc --noEmit — green in WSL already
npm run build        # exercises the new pages + Server Actions
npm test             # unchanged isolation suite — NO schema change, stays 30/30
```

`next typegen` regenerates `.next/types/routes.d.ts` for the new route
segments — a raw `tsc` without it fails on the new `PageProps<'/suppliers/…'>`
literals. `npm run typecheck` already chains it.

Optional manual smoke once `next dev` is up, on a fresh Account:
picker → Reference registers → Supplier register → Add supplier → save → edit.
Then open a project → a stage's **Tasks** → Add task (pick the subcontractor,
enter a labour amount + two take-off lines) → save → confirm the stage overview
`openLabourCommitments` / `remainingLabour` moved → edit the task → delete it →
figures return.

## Report back

Paste any `lint` / `typecheck` / `build` / `test` failure output. If all green →
Slice 2.4b is done; next is **Slice 2.6** (Purchase Order write lifecycle), now
with the Supplier Register in place to pick from.
