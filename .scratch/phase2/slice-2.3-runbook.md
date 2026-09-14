# Slice 2.3 — procurement types + read DAL + read-screen cutover — runbook

> **Verified 2026-09-09** (commit `56b8b3c`): `lint` / `typecheck` / `build` /
> `test` (30/30) all green Windows-side. This runbook is kept for the record.

**No migration in this slice.** The money schema (incl. every `purchase_orders`
/ `*_lines` / `delivery_records` / `payment_records` column this slice reads)
landed in `0003_money_tables` with Slice 2.2. Slice 2.3 is pure TypeScript on
top of it — `tsc --noEmit` and `eslint` already pass in WSL. Only `npm test` /
`npm run build` need the Windows side / CI.

## What changed

Promoted out of the retired mock files (multi-tenancy ticket 08 §5), on the
ticket 09 §2/§3 vocabulary:

- `src/lib/procurement.ts` **(new)** — `PurchaseOrder` / `POMaterialLine` /
  `DeliveryRecord` / `DeliveryRecordLine` / `PaymentRecord` types, the
  `POStatus` union (`Planned | Ordered | Partially Delivered | Delivered |
  Partially Paid | Paid | Cancelled | Closed` — `Confirmed` / `Issued` dropped),
  `POStoredStatus`, and the pure helpers `orderedTotal`, `acceptedValue`,
  `paidTotal`, `outstandingValue`, `derivePOStatus`. New `derivePOStatus` body:
  terminal / `Planned` come from the stored `status`; the middle states are read
  off non-voided payments + the rolled-up line quantities. No `confirmed` branch.
- `src/lib/funding.ts` **(new)** — `TaskLine` / `MaterialLine` / `LabourLine`
  types + `materialTotal` / `labourTotal`, promoted out of `funding-mock.ts`.
- `src/lib/funding-mock.ts` — now only the throwaway `tasksForStage` generator;
  imports `TaskLine` from `@/lib/funding`. Deleted in Slice 2.5/2.6.
- `src/lib/procurement-mock.ts` — **deleted** (fully dead after the cutover; its
  generators were "thrown away" per ticket 08 §5). The Phase 2 status ledger's
  "2.6 deletes procurement-mock.ts" line is updated — 2.6 now deletes only
  `mock-data.ts` + `funding-mock.ts`.
- `src/lib/data/procurement.ts` **(new)** — read DAL:
  `listPurchaseOrders(projectId)`, `getPurchaseOrder(poId)`. `withAccount` +
  RLS, no `accountId` in any signature; cross-account / missing id → `[]` /
  `null` → `notFound()`. Returns the nested `PurchaseOrder` view-model with each
  line's delivered/accepted/rejected quantities rolled up from the non-voided
  delivery records. `numeric` money/qty columns are `Number()`-ed. Supplier name
  resolves to the `document_snapshot` `counterpartyName` (frozen at Issue), then
  the live register name, then `"Unlinked supplier"`.
- `src/lib/data/index.ts` — barrel now re-exports the two PO read functions.
- `src/app/(app)/projects/[id]/procurement/page.tsx` — reads
  `getProjectOverview(id)` + `listPurchaseOrders(id)`; `po.displayNumber ??
  "Draft"`, `po.supplierName`.
- `src/app/(app)/projects/[id]/procurement/[poId]/page.tsx` — reads
  `getPurchaseOrder(poId)`, 404s when the PO's `projectId` ≠ the route.
- `src/app/(app)/projects/[id]/procurement/[poId]/_components/PurchaseOrderDetail.tsx`
  — **read-only rewrite**: no `"use client"`, no `useState`, no delivery /
  payment / confirm / cancel / close UI. Renders the stat cards, the material
  lines table, the issued/expected/terms line, the supplier-ack note, and the
  Deliveries / Payments history (voided records shown struck through). The
  mutations return in Slice 2.6.
- `src/app/(app)/projects/[id]/procurement/_components/POStatusBadge.tsx` —
  config re-keyed to the new `POStatus` (`Planned` badge added, `Confirmed` /
  `Issued` removed); imports the type from `@/lib/procurement`.
- `src/app/(app)/projects/[id]/funding/new/_components/FundingRequestBuilder.tsx`
  — type/helper imports re-pointed to `@/lib/funding` (`tasksForStage` still
  from `@/lib/funding-mock`).

`procurement/new` + `funding/new` still call `getProject` from `mock-data.ts` —
untouched, rebuilt on the write DAL in Slices 2.5/2.6.

## Verify (Windows / CI)

```powershell
cd web
npm run lint
npm run typecheck
npm run build          # exercises the procurement read screens against the DAL types
npm test               # unchanged isolation suite — still green (no schema change)
```

`tsc --noEmit` + `eslint` already confirmed green in WSL.

## Report back

Paste any `lint` / `typecheck` / `build` / `test` failure output. If all green →
Slice 2.3 is done; next is **Slice 2.4** (structure CRUD + opaque-UUID routes).
