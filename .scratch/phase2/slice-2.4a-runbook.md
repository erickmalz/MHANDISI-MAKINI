# Slice 2.4a — Projects + Stages CRUD — runbook

> **Verified 2026-09-09** (commit `893ba28`): `lint` / `typecheck` / `build` /
> `test` (30/30) all green Windows-side. This runbook is kept for the record.

**No migration in this slice.** The `projects` and `stages` tables (and every
column this slice writes) landed in `0002_domain_structure` with Slice 2.1.
Slice 2.4a is pure TypeScript on top of it — `tsc --noEmit` and `eslint`
already pass in WSL. Only `npm test` / `npm run build` need the Windows side
/ CI.

## What changed

The write side of the structure DAL (multi-tenancy ticket 08 §3), on the
2.1/2.2 schema:

- `src/lib/validation/structure.ts` **(new)** — isomorphic Zod
  (`projectInputSchema`, `stageInputSchema`). No `server-only`: the Server
  Action parses `FormData` with these and the forms follow the same field
  contract. `stageInputSchema` `superRefine`s fee basis → amount/percent.
  Enum literals mirror the `pgEnum`s in `schema/{projects,stages}.ts`.
- `src/lib/forms/action-helpers.ts` **(new)** — `ActionState` (the
  `useActionState` shape: `error?`, `fieldErrors?`) + `zodFieldErrors` (first
  message per top-level field).
- `src/lib/data/structure.ts` **(new)** — write DAL:
  `getProjectInput` / `createProject` / `updateProject`,
  `getStageInput` / `createStage` / `updateStage` / `setCurrentStage`.
  `withAccount` + RLS, no `accountId` in any signature. `createProject` mints
  `PRJ-{year}-{NNN}` per-Account in-txn (`COUNT` + `UNIQUE (account_id,
  project_code)` backstop); `createStage` assigns `MAX(seq)+1` and, when the
  project has no `current_stage_id` yet, points it at the new stage. Update /
  set-current read the returned-rows count — a missing / cross-account id is a
  no-op and the caller returns `false`/`null` → the screen 404s.
- `src/lib/data/index.ts` — barrel re-exports the seven structure functions.
- `src/app/actions/projects.ts` **(new)** — `createProjectAction` /
  `updateProjectAction`. Parse → DAL → `revalidatePath` → `redirect` to the
  project. Ids arrive as bound args, never from the form body.
- `src/app/actions/stages.ts` **(new)** — `createStageAction` /
  `updateStageAction` / `setCurrentStageAction` (the last is a bare form
  action bound with `projectId` + `stageId`).
- `src/app/(app)/projects/_components/ProjectForm.tsx` **(new)** — client
  form on `useActionState`, `Field` + `controlClass`, `noValidate` (errors
  come from the server parse).
- `src/app/(app)/projects/_components/StageForm.tsx` **(new)** — same, with a
  controlled fee-basis `<select>` that shows the amount **or** percent input
  and keeps a hidden empty input for the inactive one so its name always
  posts.
- `src/app/(app)/projects/new/page.tsx` **(new)** — `createProjectAction`.
- `src/app/(app)/projects/[id]/edit/page.tsx` **(new)** — `getProjectInput`
  → 404 if `null`; `updateProjectAction.bind(null, id)`.
- `src/app/(app)/projects/[id]/stages/new/page.tsx` **(new)** —
  `getProjectOverview` for the project name + next `seq` label.
- `src/app/(app)/projects/[id]/stages/[stageId]/edit/page.tsx` **(new)** —
  `getStageInput` → 404 if `null` or `projectId` ≠ the route.
- `src/app/(app)/page.tsx` — "New project" button in the header; the empty
  state now links to `/projects/new` instead of "coming in the next slice".
- `src/app/(app)/projects/[id]/page.tsx` — "Edit project" link; the
  no-stages empty state links to `/projects/[id]/stages/new`; passes
  `projectId` to `StageList`.
- `src/app/(app)/projects/[id]/_components/StageList.tsx` — "Add stage"
  link, per-stage "Edit" link and a "Work this stage" form button
  (`setCurrentStageAction`).

Opaque-UUID routes (ticket 06/08) need no work here — the `[id]` / `[poId]`
segments already carry the DB UUIDs from the 2.2 read cutover; there were
never slug ids in the persisted app.

`projects/[id]/funding/new` still calls `getProject` from `mock-data.ts` —
untouched, rebuilt on the write DAL in Slice 2.5.

## Verify (Windows / CI)

```powershell
cd web
npm run lint
npm run typecheck
npm run build          # exercises the new pages + Server Actions
npm test               # unchanged isolation suite — still green (no schema change)
```

`tsc --noEmit` + `eslint` already confirmed green in WSL.

Optional manual smoke once `next dev` is up: create a project from the empty
state → land on its overview → add a first stage → confirm it becomes the
current stage → edit both.

## Report back

Paste any `lint` / `typecheck` / `build` / `test` failure output. If all
green → Slice 2.4a is done; next is **Slice 2.4b** (Tasks, Supplier /
Subcontractor registers, Material Take-Off lines — same DAL / validation /
action-helper pattern).
