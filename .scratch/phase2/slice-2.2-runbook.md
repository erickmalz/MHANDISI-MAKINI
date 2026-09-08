# Slice 2.2 — money tables — Windows runbook

The 13 money-table schema files are written and pass `tsc --noEmit` in WSL.
Migration generation needs `drizzle-kit` (native `esbuild`), and the isolation
suite needs Docker — both Windows-only here, same as Slice 2.1. Do these steps
on the Windows side.

## New schema files (Slice 2.2 — schema part)

```
src/lib/data/schema/snapshot.ts              (type-only — document_snapshot shape)
src/lib/data/schema/document-numbers.ts      document_number_sequences
src/lib/data/schema/funding-requests.ts      funding_requests
src/lib/data/schema/funding-request-lines.ts funding_request_lines
src/lib/data/schema/fee-invoices.ts          fee_invoices
src/lib/data/schema/deposits.ts              deposits
src/lib/data/schema/purchase-orders.ts       purchase_orders
src/lib/data/schema/purchase-order-lines.ts  purchase_order_lines
src/lib/data/schema/delivery-records.ts      delivery_records + delivery_record_lines
src/lib/data/schema/payment-records.ts       payment_records
src/lib/data/schema/labour-payments.ts       labour_payments
src/lib/data/schema/petty-cash-expenses.ts   petty_cash_expenses
src/lib/data/schema/other-commitments.ts     other_commitments
src/lib/data/schema/enums.ts                 (+ payment_method, document_number_type)
src/lib/data/schema/index.ts                 (+ the 13 export lines)
tests/isolation/conformance.test.ts          (sanity list extended to the money tables)
```

## 1. Generate the migration

```powershell
cd web
npm run db:generate -- --name money_tables
```

Writes `web/drizzle/0003_money_tables.sql`, `web/drizzle/meta/0003_snapshot.json`,
and a `_journal.json` entry. It must **not** prompt — every table and enum is
brand new, no renames.

## 2. Append the RLS block to the generated SQL

Open `web/drizzle/0003_money_tables.sql` and add this to the very end (the file
has not been applied yet, so editing it now is safe). Same pattern as `0002`:

```sql
--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`.
SELECT app.enable_standard_rls('public.document_number_sequences');--> statement-breakpoint
SELECT app.enable_standard_rls('public.funding_requests');--> statement-breakpoint
SELECT app.enable_standard_rls('public.funding_request_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.fee_invoices');--> statement-breakpoint
SELECT app.enable_standard_rls('public.deposits');--> statement-breakpoint
SELECT app.enable_standard_rls('public.purchase_orders');--> statement-breakpoint
SELECT app.enable_standard_rls('public.purchase_order_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.delivery_records');--> statement-breakpoint
SELECT app.enable_standard_rls('public.delivery_record_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.payment_records');--> statement-breakpoint
SELECT app.enable_standard_rls('public.labour_payments');--> statement-breakpoint
SELECT app.enable_standard_rls('public.petty_cash_expenses');--> statement-breakpoint
SELECT app.enable_standard_rls('public.other_commitments');
```

## 3. Apply and verify

```powershell
docker compose up -d      # repo root, if not already running
cd web
npm run db:migrate        # applies 0003
npm test                  # conformance.test.ts sweeps all 13 new tables
npm run lint
npm run typecheck
npm run build
```

Expected:

- `db:migrate` — "Migrations applied." with no error.
- `npm test` — `conformance.test.ts` finds all 13 money tables and confirms each
  has RLS enabled + forced, exactly the `account_isolation` policy, a NOT NULL
  `account_id`, and every domain→domain FK carrying `account_id`. The
  two-account graph test and `composite-fk.test.ts` still pass.
- `db:studio` (optional) — spot-check `funding_requests`, `purchase_orders`,
  `document_number_sequences`.

## 4. Report back

Paste me the generated `web/drizzle/0003_money_tables.sql` (so I can confirm it
matches intent) and any failure output from `npm test` / `npm run build`.

---

# Slice 2.2 Part B — read DAL + projection + read-screen cutover

Pure TypeScript on top of the verified `0003` schema. Passes `tsc` in WSL;
run the rest on Windows / CI.

## What changed

- `src/lib/data/projection.ts` — `computeStageFinancials(tx, stageId)`: builds
  `StageFinancials` by summing the atomic records inside the RLS transaction
  (ticket 08 §1). `finance.ts` untouched.
- `src/lib/data/projects.ts` — `listProjects()`, `getProjectOverview(id)`.
- `src/lib/data/alerts.ts` — `deriveProjectAlerts()` (computed, not stored).
- `src/lib/data/index.ts` — barrel; `src/lib/project-view.ts` — pure
  `getCurrentStage` (now `Stage | undefined`).
- `src/lib/types.ts` — `Project.currentStageId` is `string | null`.
- `src/app/(app)/page.tsx` + `projects/[id]/page.tsx` — read from `@/lib/data`,
  with "no projects" / "no stages" empty states.
- `mock-data.ts` / `funding-mock.ts` / `procurement-mock.ts` — **retained**, now
  only feeding the Funding Request Builder and Purchase Order screens (rebuilt
  in Slices 2.5 / 2.6, deleted then).

## Verify

```powershell
cd web
npm run lint
npm run typecheck
npm run build          # exercises the read screens against the DAL types
npm test               # unchanged suite still green
```

Then, to see it end to end against a real database:

```powershell
# with `docker compose up -d` and 0003 applied
npm run dev
```

Sign up a fresh engineer → the picker shows the **"No projects yet"** empty
state (a new Account starts empty — nothing is seeded). There is no
create-project UI yet (Slice 2.4), so that is the expected end state for now.

## Report back

Paste any `lint` / `typecheck` / `build` failures.

## Notes / deferred

- **`variations`** (guidelines Phase 3 — Change & Forecast Control) is **not** in
  this slice. Until it lands, the projection treats `remainingOtherApproved` and
  the "approved-but-unrealised" input as 0.
- **`supplier_id` on `purchase_orders`** and **`stage_id` on
  `petty_cash_expenses`** are **loose columns** (no composite FK), the same call
  2.1 made for `tasks.subcontractor_id` — a register/parent row must stay
  deletable without a cascade that nukes financial history or nulls
  `account_id`. The DAL validates them; the PO snapshot freezes the supplier
  identity at Issue anyway.
- **`delivery_record_lines`** has two CASCADE FK legs (to `delivery_records` and
  to `purchase_order_lines`) — a real diamond under a PO delete. Both legs agree
  (delete), which Postgres permits.
