# Phase 2 — build status

_Last updated: session 01FmN5ffY6USyPqvfJwkssZE (2026-09-09). Read this first
when picking Phase 2 back up in a new session._

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
| 2.2 | Money-table schema (13 tables) + migration `0003` + read DAL + `StageFinancials` projection + picker/overview cutover. | **Done** (`d05504c`, `775b9a0`, `006e874`). Runbook: `.scratch/phase2/slice-2.2-runbook.md`. **Awaiting**: user confirming `npm run build` green Windows-side for Part B (schema + migrate + `npm test` already confirmed green). |
| 2.3 | Promote PO / Delivery / Payment / TaskLine types + pure helpers out of `procurement-mock.ts` / `funding-mock.ts` into permanent homes (`src/lib/procurement.ts`), on **ticket-09 vocabulary** — `POStatus` becomes `Planned \| Ordered \| Partially Delivered \| Delivered \| Partially Paid \| Paid \| Cancelled \| Closed` (drop `Confirmed`/`Issued`), new `derivePOStatus` body operating on stored `status` + non-voided child records. Read DAL: `listPurchaseOrders(projectId)`, `getPurchaseOrder(poId)`. Cut the procurement **list** + **detail** screens to read-only from the DAL. `POStatusBadge` config updated. | Not started |
| 2.4 | Structure CRUD — write DAL + Server Actions + forms for Projects, Stages, Tasks, Supplier/Subcontractor registers, Material Take-Off lines. First-run empty states already exist (2.2). Opaque-UUID routes (ticket 06/08 — drop the slug ids). This unblocks the "No projects yet" dead end. | Not started |
| 2.5 | Funding Request write lifecycle — Draft→Issued state machine, atomic Issue transaction (freeze snapshot, mint `FR-{project}-NNN` + `FI-{project}-NNN` via `document_number_sequences`, raise Fee Invoice), version/supersede, Additional Funding Request, Deposit recording. Rebuild `FundingRequestBuilder` on the DAL. | Not started |
| 2.6 | Purchase Order write lifecycle — Planned→Ordered Issue transaction, append-only Delivery/Payment records with reversal, over-limit rules. Rebuild `PurchaseOrderBuilder` + `PurchaseOrderDetail` on the DAL. **Delete** `mock-data.ts` / `funding-mock.ts` / `procurement-mock.ts` (ticket 08 §5). | Not started |
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

## Immediate next action

If the user confirms `npm run build` is green for 2.2 Part B → start **Slice 2.3**.
Otherwise fix whatever `build` surfaces first.
