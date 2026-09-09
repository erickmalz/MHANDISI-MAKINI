# Slice 2.6 — Purchase Order write lifecycle — runbook

> **Verified 2026-09-09** — `lint` + `typecheck` green in WSL; `build` + the
> full test suite reported green Windows-side by the user. Committed `34824f3`
> and pushed to `phase2-domain-structure` (PR #2) for CI.
>
> **No migration in this slice** — every table + column landed in
> `0003_money_tables` (Slice 2.2). The 2.2 projection already reads
> `purchase_orders` in `('ordered','closed')`, so `computeStageFinancials` is
> **unchanged**.

## What changed

The Purchase Order write lifecycle (multi-tenancy ticket 09 §2/§3), on the 2.2
schema and the 2.4b Supplier Register. Closes the last mock-backed page:
`/projects/[id]/procurement/new` (it still called `getProject` from the deleted
`@/lib/mock-data` and 404'd on a real Account).

### Shared numbering helper

- `src/lib/data/document-numbers.ts` **(new)** — `claimDocumentNumber(tx,
  accountId, projectId, type)` + `pad3`, lifted verbatim out of
  `src/lib/data/funding.ts` (which now imports them). Same gap-free
  `INSERT … ON CONFLICT DO UPDATE … RETURNING next_value - 1`. 2.6 claims
  `"purchase_order"`.

### Domain + validation

- `src/lib/procurement.ts` — **unchanged**. The `PurchaseOrder` view-model,
  `POStoredStatus`, `derivePOStatus` and the money derivations already carried
  the ticket-09 vocabulary from Slice 2.3.
- `src/lib/validation/procurement.ts` **(new)** — isomorphic Zod:
  `poLineSchema` / `poLinesSchema` (≥1), `purchaseOrderDraftSchema`
  (`supplierId` a required UUID, delivery date / terms / notes optional),
  `deliverySchema` (+ `deliveryLineSchema` with an accepted+rejected ≤ delivered
  refine, `deliveryLinesSchema` requiring ≥1 delivered qty), `paymentSchema`
  (method + optional `kind` enums), `voidReasonSchema`, `cancelSchema`,
  `supplierAckSchema`. Enum literals mirror the `pgEnum`s. Line rows / delivery
  quantities are posted as one JSON string in a hidden `lines` field.

### DAL — `src/lib/data/procurement.ts` (write side appended)

`withAccount` + RLS, **no `accountId` in any signature**. `supplier_id` stays a
loose column — `supplierIsValid` asserts it points at a live supplier in the
Account before every draft write / Issue.

- `createPurchaseOrderDraft(stageId, input)` / `getPurchaseOrderDraftInput` /
  `updatePurchaseOrderDraft` (delete + re-insert lines — a planned order is
  freely editable) / `deletePurchaseOrderDraft` (planned only).
- **`issuePurchaseOrder(poId)`** (`POIssueResult`) — the atomic Issue
  transaction: guard `status = planned`, ≥1 line, a valid supplier; claim
  `PO-{project_code}-{NNN}`; freeze `document_snapshot` (supplier name, terms,
  lines, ordered total); set `status = ordered` + `ordered_at`.
- **`recordDelivery(poId, input)`** (`DeliveryResult`) — append a
  `delivery_records` + `delivery_record_lines` set against an `ordered` PO.
  Non-voided delivered-so-far is summed per line; a line taken past its ordered
  quantity is a **soft block** — allowed only with `over_delivery_reason`
  (§42.12). `voidDelivery` marks a record `voided_at` + `void_reason`.
- **`recordPayment(poId, input)`** (`PaymentResult`) — append a `payment_records`
  row against an `ordered` PO. Paid-so-far + amount past the ordered total is a
  **soft block** — allowed only with `over_payment_reason` (§42.6).
  `voidPayment` marks it voided.
- **`cancelPurchaseOrder(poId, reason)`** (`ordered → cancelled`),
  **`closePurchaseOrder(poId)`** (`ordered → closed`),
  **`reopenPurchaseOrder(poId)`** (`closed → ordered`, `reopened_at`, §42.14),
  **`recordSupplierAck(poId, input)`** (a dated note on an `ordered`/`closed`
  PO, not a state gate).
- `src/lib/data/index.ts` — barrel re-exports the 14 PO functions + the 3
  result types.

### Server Actions — `src/app/actions/procurement.ts` (new)

`createPurchaseOrderAction` (bound `projectId`) / `updatePurchaseOrderAction` /
`deletePurchaseOrderDraftAction` / `issuePurchaseOrderAction` (plain `void` —
redirects back with `?issue_error=`) / `recordDeliveryAction` /
`voidDeliveryAction` / `recordPaymentAction` / `voidPaymentAction` /
`cancelPurchaseOrderAction` / `closePurchaseOrderAction` (void) /
`reopenPurchaseOrderAction` (void) / `recordSupplierAckAction`. Ids as bound
args; `revalidatePath` the overview + procurement list + detail, then `redirect`.

### Screens

- `src/app/(app)/projects/_components/PurchaseOrderForm.tsx` **(new)** — client
  form shared by new + edit: stage picker (create) / frozen stage label (edit),
  supplier `<select>` from the register (edit also keeps a now-inactive
  assigned supplier), delivery date + terms + notes, a material `RowEditor`.
  Serialized JSON in a hidden `lines` field; `useActionState` for errors.
- `procurement/new/page.tsx` — rebuilt on `getProjectOverview` + `listSuppliers`
  (empty-state links to `/suppliers/new` when the register is empty).
- `procurement/[poId]/edit/page.tsx` **(new)** — `getPurchaseOrderDraftInput` →
  404 if not planned or cross-project.
- `procurement/[poId]/page.tsx` + `_components/PurchaseOrderDetail.tsx`
  **(rebuilt as a `"use client"` component, mirrors `FundingRequestDetail`)** —
  draft (edit / issue / discard) vs issued (per-line delivery form + deliveries
  list with void; payment form + payments list with void; supplier-ack form;
  close / cancel; reopen when closed). Over-limit reasons are inline fields.
- **Deleted**: `src/lib/mock-data.ts` and
  `procurement/new/_components/PurchaseOrderBuilder.tsx` (ticket 08 §5 — this was
  `mock-data.ts`'s last importer). `procurement-mock.ts` went in 2.3,
  `funding-mock.ts` in 2.5.

## Verify (Windows / CI)

```powershell
cd web
npm run lint        # green in WSL already
npm run typecheck   # next typegen && tsc --noEmit — green in WSL already
npm run build       # exercises the new pages + Server Actions
npm test            # unchanged isolation suite — NO schema change, stays 30/30
```

Optional manual smoke once `next dev` is up, on a fresh Account:
create project → add a stage → Supplier Register → add a supplier →
project → Purchase orders → Create → pick the supplier, add two material lines →
Save draft → Edit → Issue → confirm `PO-…-001` and the overview
`openPurchaseCommitments` moved → Record a delivery (accept part of a line) →
Record a payment → try to overpay without a reason (blocked) → add a reason
(recorded, Outstanding goes negative) → void the payment → Close → Reopen.

## Report back

Paste any `lint` / `typecheck` / `build` / `test` failure output. If all green →
Slice 2.6 is done. Remaining Phase 2 slices: **2.7** (document rendering —
PDF + JPG for the Issued FR / Fee Invoice / Issued PO) and **2.8** (account
lifecycle — delete, export, profile).
