# Phase 2 — build status

_Last updated: session 019NitCcfKmLXMbTJXqxe87s (2026-09-11) — **Slice 2.7 is
CI-green.** All 4 commits (`8f84f0a`, `fada09a`, `2b73256`, `fa890ad`) are
pushed; PR #2's `web` CI job passed clean on run `34639373574` (lint /
typecheck / isolation suite / build all ✓), confirming the `react-dom/server`
dynamic-import fix worked. Still outstanding before calling 2.7 fully done:
the Windows-side manual document-download smoke check + a verification
commit (2.5/2.6 pattern) — not yet done.

**Slice 2.8 (Account lifecycle) is started.** Part 1 (schema only — see
`.scratch/phase2/slice-2.8-runbook.md`) is written: three new nullable
columns on `accounts` (`logo` bytea + `logo_content_type`,
`deletion_scheduled_at`), no new tables — every domain table already cascades
from `accounts.id`, so the eventual maintenance-role sweep is one
`DELETE FROM auth_user` per expired account. `tsc` / `eslint` clean in WSL.
**Not yet migrated** — needs `npm run db:generate` Windows-side (the runbook
has the exact command + the grant to hand-append) before Part 2 (profile
edit / logo upload DAL + UI), Part 3 (JSON export) or Part 4 (deletion
request + sweep script) start, per the verify-migration-before-building rule._

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
| 2.4b | **Remaining structure CRUD** — write DAL + Server Actions + forms + routes for the Supplier and Subcontractor registers, Tasks (under a stage), and Material Take-Off lines. No migration (tables landed in `0002`). Follows the 2.4a DAL / validation / action-helper pattern. Pulled ahead of 2.6 (2.6 needs the Supplier Register). | **Done + verified** (commit `85f778b`; CI run `34395773042` on PR #2 — `lint` / `typecheck` / isolation suite / `build` all ✓). Runbook: `.scratch/phase2/slice-2.4b-runbook.md`. |
| 2.5 | Funding Request write lifecycle — Draft→Issued state machine, atomic Issue transaction (freeze snapshot, mint `FR-{project}-NNN` + `FI-{project}-NNN` via `document_number_sequences`, raise Fee Invoice), version/supersede, Additional Funding Request, Deposit recording. Rebuilt the builder on the DAL as `FundingRequestForm` + new detail/edit/list routes. `funding-mock.ts` + the old `FundingRequestBuilder` **deleted**. | **Done + verified** (CI run `34360555087` on PR #2 — `lint` / `typecheck` / isolation suite / `build` all ✓). Runbook: `.scratch/phase2/slice-2.5-runbook.md`. |
| 2.6 | Purchase Order write lifecycle — Planned→Ordered Issue transaction, append-only Delivery/Payment records with reversal, over-limit soft-blocks, cancel / close / reopen, supplier acknowledgement. Supplier picked from the 2.4b register. Rebuilt `procurement/new` on a new shared `PurchaseOrderForm`; `PurchaseOrderDetail` rebuilt as a `"use client"` mutation surface. `claimDocumentNumber` extracted to `src/lib/data/document-numbers.ts`. **`mock-data.ts` + `PurchaseOrderBuilder.tsx` deleted.** | **Done + verified** (commit `34824f3`; CI run `34403407649` on PR #2 — `lint` / `typecheck` / isolation suite / `build` all ✓). Runbook: `.scratch/phase2/slice-2.6-runbook.md`. |
| 2.7 | Document rendering (ticket 10 / ADR 0005) — `puppeteer` + warm in-container Chromium, `document_snapshot` type tightened to a `kind`-union + the 3 Issue writers updated, `src/lib/documents/` render module (browser singleton / concurrency gate / timeout, `renderPdf`/`renderJpg`, `print-css.ts` reusing `--mm-*`, 3 React templates), read DAL `src/lib/data/documents.ts` (`get*Document` + derived stamp + live-profile letterhead), 6 route handlers (`document.pdf`/`.jpg` for FR / Fee Invoice / PO), `DocumentDownloads` card on FR + PO detail, provisional `web/Dockerfile`, vocabulary test. **Code-only, no migration.** | **4 commits, 3 pushed + CI-red, 1 local fix unpushed** — `8f84f0a`/`fada09a`/`2b73256` pushed, PR #2 `web` CI job failed (Turbopack: `react-dom/server` imported outside a Server Component); `fa890ad` (local) fixes it via dynamic import, not yet pushed/verified. Runbook: `.scratch/phase2/slice-2.7-runbook.md` |
| 2.8 | Account lifecycle (ticket 02) — hard-delete + maintenance-role sweep, JSON data export, profile edit (name/phone/logo for the letterhead). | **Started — Part 1 (schema) written, unmigrated.** `logo`/`logo_content_type`/`deletion_scheduled_at` added to `accounts`. Parts 2–4 (DAL/actions/UI/sweep) not started. Runbook: `.scratch/phase2/slice-2.8-runbook.md` |

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

## Key facts for the Funding Request write DAL (built, 2.5)

- `web/src/lib/data/funding.ts` — read (`listFundingRequests`,
  `getFundingRequest`) + write (draft CRUD, `issueFundingRequest`,
  `supersedeFundingRequest`, `recordDeposit` / `voidDeposit`,
  `markFeeInvoicePaid`). Same `withAccount` + RLS rule; no `accountId` in any
  signature.
- **Numbering** goes through `claimDocumentNumber(tx, accountId, projectId,
  type)` — `INSERT … ON CONFLICT (project_id, type) DO UPDATE SET next_value =
  next_value + 1 RETURNING next_value - 1`. Gap-free per project. Reuse this
  helper for `PO-{project}-NNN` in 2.6 (it already takes `"purchase_order"`).
- **Issue appends a `fee` category line** to `funding_request_lines` so the
  projection's `fr_fee` matches `fee_invoiced` and `remainingFee` stays 0 after
  issue. The `document_snapshot` `total` is the **deposit target** (material +
  labour + other) — the fee is a display-only section (billed via the Fee
  Invoice).
- **Supersede** forks a Draft `version + 1`; the predecessor only moves to
  `superseded` when the fork is Issued. Fee Invoice on supersede: unpaid →
  reissued in place onto the new version (no projection change needed); paid →
  untouched + a positive delta invoice. See the runbook for the ticket-09
  wording call.
- **No `computeStageFinancials` change** in 2.5 — the projection already reads
  `funding_requests` / `funding_request_lines` / `deposits` / `fee_invoices`
  correctly (2.2).

## Key facts for the 2.4b structure DAL + registers (built, 2.4b)

- `web/src/lib/data/registers.ts` — the per-Account Supplier / Subcontractor
  registers (read + write). No delete (retire with `status = inactive`). Same
  `withAccount` + RLS rule, no `accountId` in any signature.
- `web/src/lib/data/tasks.ts` — Tasks (`listTasksForStage`, `getStageDetail`,
  `getTaskInput`, `createTask`, `updateTask`, `deleteTask`) + Material Take-Off
  lines (edited inline on the task, delete-and-reinsert). `seq = MAX(seq)+1`
  per stage. `tasks.subcontractor_id` is a **loose column** — the DAL asserts
  it points at a live subcontractor in the Account. `deleteTask` is refused
  when the Task has any Labour Payment (cascade would drop the history);
  `getTaskInput.hasLabourPayments` drives the edit page's delete button.
- **No `computeStageFinancials` change** in 2.4b. The 2.2 projection already
  reads `tasks.labour_original` for `openLabourCommitments` /
  `remainingLabour`, so creating a task with a labour amount moves those
  figures — that is correct (a signed Labour Agreement reduces float).
  `material_lines` are **not** read by the projection (Material Variance is a
  later slice).
- New routes: `/suppliers` + `/subcontractors` (each `/new`, `/[id]/edit`),
  `/projects/[id]/stages/[stageId]` (stage detail / task list),
  `/projects/[id]/stages/[stageId]/tasks/new`,
  `/projects/[id]/tasks/[taskId]/edit`. `next typegen` must run before `tsc`
  for the new `PageProps` literals (`npm run typecheck` chains it).

## Key facts for the Purchase Order write DAL (built, 2.6)

- `src/lib/data/procurement.ts` — read (2.3) + write (2.6, appended). Same
  `withAccount` + RLS rule, no `accountId` in any signature.
  `supplier_id` is a **loose column** — `supplierIsValid` asserts it points at a
  live supplier in the Account before every draft write and at Issue.
- **Numbering** goes through `claimDocumentNumber` / `pad3` in the new
  `src/lib/data/document-numbers.ts` (extracted from `funding.ts`, which now
  imports it). `PO-{project_code}-{NNN}`.
- **Issue** (`issuePurchaseOrder` → `POIssueResult`): `planned → ordered`,
  freezes `document_snapshot`, sets `ordered_at`. No fee, no version chain — a
  real change is cancel-and-reissue (ADR 0003).
- **Delivery / Payment** are append-only with reversal (`voidDelivery` /
  `voidPayment` set `voided_at` + `void_reason`). Over-limit is a soft block:
  `recordDelivery` needs `over_delivery_reason` past a line's ordered qty
  (§42.12); `recordPayment` needs `over_payment_reason` past the ordered total
  (§42.6). Both only act on an `ordered` PO.
- **`cancelPurchaseOrder`** (`ordered → cancelled`), **`closePurchaseOrder`**
  (`ordered → closed`), **`reopenPurchaseOrder`** (`closed → ordered`, §42.14),
  **`recordSupplierAck`** (a dated note on `ordered`/`closed`).
- **No `computeStageFinancials` change** in 2.6 — the 2.2 projection already
  reads `purchase_orders` in `('ordered','closed')` with the ticket-09 §4
  exposure rule.

## Key facts for document rendering (built, 2.7)

- `src/lib/data/schema/snapshot.ts` — `DocumentSnapshot` is a `kind`-union
  (`FundingRequestSnapshot` / `FeeInvoiceSnapshot` / `PurchaseOrderSnapshot`).
  The three Issue writers in `funding.ts` / `procurement.ts` were updated in
  lockstep — this is the only change that rides the 2.5 / 2.6 Issue-transaction
  tests, so `npm test` on Windows/CI is the real check on it.
- `src/lib/documents/` — the render module. `renderDocument(doc, "pdf"|"jpg")`
  is the entry point; `serveDocument(...)` in `response.ts` is what the route
  handlers call. `puppeteer` is a **dynamic** `import()` and is in
  `serverExternalPackages` — the server bundle never tries to bundle Chromium.
- `src/lib/data/documents.ts` — read side. The **stamp** (`SUPERSEDED` /
  `CANCELLED` / `PAID — {date}`) is derived from the *live* row here, never
  frozen. The **letterhead** (`getDocumentProfile`) is the live Account
  `full_name` + `phone` — logo + email come with 2.8.
- Route Handlers do **not** run the `(app)` layout, so the auth gate is the
  DAL's `verifySession` (a thrown `NotAuthenticatedError` → 404 in
  `serveDocument`). Draft / cross-account / missing → 404; render overload →
  503.
- `web/Dockerfile` is **provisional** — it exists to pin the Chromium deps +
  `fonts-dejavu-core` + ~1 GB RAM floor. The deployment-shape slice owns the
  real image.

## Immediate next action

Two independent threads are open:

1. **Close out Slice 2.7**: CI is green on PR #2, but the runbook's Windows-side
   manual smoke check is still outstanding — `npm run dev`, download all six
   documents for a project with an issued FR + Fee Invoice + issued PO, then
   record the verification commit (2.5 / 2.6 pattern).
2. **Slice 2.8, Part 1 → Part 2**: run `npm run db:generate -- --name
   account_lifecycle` Windows-side (exact steps + the grant to hand-append in
   **`.scratch/phase2/slice-2.8-runbook.md`**), apply + verify it (`db:migrate`,
   `test`, `lint`, `typecheck`, `build`), report the output back, then Part 2
   (profile edit + logo upload DAL/UI) can start. Two open product calls flagged
   in the runbook before Part 2: the settings route's URL path, and logo upload
   size/MIME limits.
