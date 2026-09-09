# Phase 2 — build status

_Last updated: session 01LbT1zAHEgpdbHab6gWkL6y (2026-09-09) — Slices 2.3 and
2.4a (Projects + Stages CRUD) committed and **fully verified Windows-side**
(`npm run build` ✓, `npm test` 30/30 ✓, incl. `conformance.test.ts`). Next is
Slice 2.4b. Read this first when picking Phase 2 back up in a new session._

## What Phase 2 is

Turning the single-user mock prototype into the real multi-tenant persisted app.
The multi-tenancy decision map (`.scratch/multi-tenancy/`) is **fully resolved**
(all 10 tickets + ADRs 0001–0005) — Phase 2 is a pure build against that spec,
so there is no Phase 2 decision map. Slices are tracked here.

Branch: **`phase2-domain-structure`** (not yet PR'd to `main`).

## Environment constraint (important)

`web/node_modules` is **Windows-built**. In WSL only `tsc` and `eslint` run;
`drizzle-kit` (native esbuild) and the Testcontainers isolation suite (Docker)
do **not**. Migration generation, `npm run db:migrate`, `npm test`, and
`npm run build` are Windows-side or CI, driven by a per-slice runbook under
`.scratch/phase2/`. Land + verify a schema migration before building the DAL on
top of it (see the memory `mhandisi-makini-verify-migration-before-building-on-it`).

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 2.1 | Structure tables (projects, stages, tasks, suppliers, subcontractors, material_lines) + RLS + conformance lint. Migration `0002`. | **Done** (commits `8601e6b`, `a52e503`) |
| 2.2 | Money-table schema (13 tables) + migration `0003` + read DAL + `StageFinancials` projection + picker/overview cutover. | **Done + verified** (`d05504c`, `775b9a0`, `006e874`). Runbook: `.scratch/phase2/slice-2.2-runbook.md`. `build` confirmed green in the same run as 2.3 / 2.4a. |
| 2.3 | Promote PO / Delivery / Payment / TaskLine types + pure helpers out of `procurement-mock.ts` / `funding-mock.ts` into permanent homes (`src/lib/procurement.ts`, `src/lib/funding.ts`), on **ticket-09 vocabulary** — `POStatus` becomes `Planned \| Ordered \| Partially Delivered \| Delivered \| Partially Paid \| Paid \| Cancelled \| Closed` (drop `Confirmed`/`Issued`), new `derivePOStatus` body operating on stored `status` + non-voided child records. Read DAL: `listPurchaseOrders(projectId)`, `getPurchaseOrder(poId)`. Cut the procurement **list** + **detail** screens to read-only from the DAL. `POStatusBadge` config updated. | **Done + verified** (commit `56b8b3c`). `tsc` / `eslint` / `build` / `test` all green. Runbook: `.scratch/phase2/slice-2.3-runbook.md`. `procurement-mock.ts` **deleted** here (fully dead post-cutover), so 2.6 below no longer deletes it. |
| 2.4a | **Projects + Stages CRUD** — write DAL (`src/lib/data/structure.ts`: `getProjectInput`/`createProject`/`updateProject`, `getStageInput`/`createStage`/`updateStage`/`setCurrentStage`), isomorphic Zod (`src/lib/validation/structure.ts`), Server Actions (`src/app/actions/{projects,stages}.ts`), forms (`projects/_components/{ProjectForm,StageForm}.tsx`) and routes (`projects/new`, `projects/[id]/edit`, `projects/[id]/stages/new`, `projects/[id]/stages/[stageId]/edit`). Empty states on the picker and overview now link to the create flows. `project_code` (`PRJ-{year}-{NNN}`) minted per-Account in-txn; first stage becomes `current_stage_id`. Routes already carry opaque UUIDs (came with the 2.2 read cutover). | **Done + verified** (commit `893ba28`). `tsc` / `eslint` / `build` / `test` all green. Runbook: `.scratch/phase2/slice-2.4a-runbook.md`. |
| 2.4b | **Remaining structure CRUD** — write DAL + Server Actions + forms + routes for Tasks (under a stage), the Supplier and Subcontractor registers, and Material Take-Off lines. No migration (tables landed in `0002`). Follows the same DAL / validation / action-helper pattern 2.4a set. | Not started |
| 2.5 | Funding Request write lifecycle — Draft→Issued state machine, atomic Issue transaction (freeze snapshot, mint `FR-{project}-NNN` + `FI-{project}-NNN` via `document_number_sequences`, raise Fee Invoice), version/supersede, Additional Funding Request, Deposit recording. Rebuild `FundingRequestBuilder` on the DAL. | Not started |
| 2.6 | Purchase Order write lifecycle — Planned→Ordered Issue transaction, append-only Delivery/Payment records with reversal, over-limit rules. Rebuild `PurchaseOrderBuilder` + `PurchaseOrderDetail` on the DAL. **Delete** `mock-data.ts` / `funding-mock.ts` (ticket 08 §5 — `procurement-mock.ts` already deleted in 2.3). | Not started |
| 2.7 | Document rendering (ticket 10) — `puppeteer` + warm Chromium in the app container, 3 React templates + print CSS, PDF + JPG route handlers, app `Dockerfile` (Chromium + `fonts-dejavu-core`). | Not started |
| 2.8 | Account lifecycle (ticket 02) — hard-delete + maintenance-role sweep, JSON data export, profile edit (name/phone/logo for the letterhead). | Not started |

## Key facts for the projection / DAL (already built, 2.2)

- `web/src/lib/data/projection.ts` — `computeStageFinancials(tx, stageId)`.
  `finance.ts` is unchanged and authoritative. PO float exposure: open
  (`ordered`) PO → `max(0, ordered − paid)` into openPurchaseCommitments +
  payments into paidPurchases; `closed` PO → payments only; `cancelled` →
  nothing (ticket 09 §4). Money values come back from `tx.execute` as strings —
  `Number()` them.
- `web/src/lib/data/projects.ts` — `listProjects()`, `getProjectOverview(id)`.
  No `accountId` in any signature; `withAccount` + RLS. Cross-account id → `null`
  → `notFound()`.
- `web/src/lib/data/with-account.ts` exports `AccountTx` (the tx handle type).
- `web/src/lib/project-view.ts` — pure `getCurrentStage` (→ `Stage | undefined`)
  + `stageStatusLabel` (DB snake_case enum → display union).
- `variations` table is **deferred to Phase 3**, so `remainingOtherApproved`
  is hardcoded 0 in the projection.
- `document_snapshot` JSONB shape lives in `web/src/lib/data/schema/snapshot.ts`
  — loose for now, refined by slice 2.7.

## Key facts for the structure write DAL (built, 2.4a)

- `web/src/lib/data/structure.ts` — the write side (ticket 08 §3). No
  `accountId` in any signature: `withAccount` sets the tenant GUC and RLS
  (`WITH CHECK`) is the backstop, so an insert only ever writes the caller's
  own row and a cross-account update is a silent no-op — the callers read the
  returned-rows count and 404. `project_code` / stage `seq` are minted inside
  the same transaction (`COUNT`/`MAX+1`), with the `UNIQUE` constraints as the
  single-user-account race backstop.
- `web/src/lib/validation/structure.ts` — isomorphic Zod (no `server-only`):
  the Server Action parses `FormData` with it and the schema doubles as the
  form field contract. Enum literals must match the Drizzle `pgEnum` values.
- `web/src/lib/forms/action-helpers.ts` — `ActionState` (the `useActionState`
  shape) + `zodFieldErrors`. Server Actions redirect on success, return
  `{ error }` / `{ fieldErrors }` on failure.
- `numeric` columns (`stages.fee_percent`) round-trip as strings — `Number()`
  on read, `String()` on write; `bigint({ mode: "number" })` money columns
  (`fee_amount`) are already numbers.

## Immediate next action

Slices 2.3 and 2.4a are committed and fully verified Windows-side (`build` ✓,
`test` 30/30 ✓). The same run cleared the outstanding 2.2 Part B `build`
question. Start **Slice 2.4b** — Tasks (under a stage), the Supplier and
Subcontractor registers, and Material Take-Off lines. No migration (tables
landed in `0002`). Follow the pattern 2.4a set: write DAL in
`src/lib/data/structure.ts` (or a sibling), isomorphic Zod in
`src/lib/validation/`, Server Actions returning `ActionState`, client forms on
`useActionState`, opaque-UUID routes.
