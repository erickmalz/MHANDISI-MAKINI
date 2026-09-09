# Slice 2.5 — Funding Request write lifecycle — runbook

> WSL-side `tsc --noEmit` + `eslint` are **green**. `npm run build` and
> `npm test` are Windows / CI (env constraint in `status.md`). **No migration
> in this slice** — every table + column landed in `0003_money_tables`
> (Slice 2.2). CI + Windows `build`/`test` is the full check.

## What changed

The Funding Request write lifecycle (multi-tenancy ticket 09 §1), on the 2.2
schema. Closes the two 404ing pages: `/projects/[id]/funding/new` and the new
detail/edit routes now run entirely on the DAL.

### New domain + validation

- `src/lib/funding.ts` — extended with the `FundingRequest` read view-model
  (`FRStoredStatus`, `FRKind`, `FundingLineCategory`, `PaymentMethod`,
  `FundingRequestLine`, `Deposit`, `FundingRequestFeeInvoice`) plus pure
  derivations: `materialSubtotal` / `labourSubtotal` / `feeSubtotal` /
  `otherSubtotal`, `depositTarget` (material + labour + other — **fee excluded**,
  it is billed via the Fee Invoice), `depositedTotal`, `depositOutstanding`,
  `deriveFRStatus` (`Draft` / `Issued` / `Partially Deposited` / `Deposited` /
  `Superseded` / `Cancelled` / `Closed`). The Slice 2.3 worksheet types
  (`MaterialLine` etc.) are kept.
- `src/lib/validation/funding.ts` **(new)** — isomorphic Zod:
  `fundingLineSchema` (a `material` line is `qty × unitCost`; `labour` / `other`
  are lump sums — `amount` re-derived server-side for a quantified line),
  `linesSchema`, `fundingRequestDraftSchema`, `depositSchema`, `supersedeSchema`,
  `voidReasonSchema`. Enum literals mirror the `pgEnum`s.

### DAL — `src/lib/data/funding.ts` (new)

`withAccount` + RLS, **no `accountId` in any signature**. Read side
(`listFundingRequests`, `getFundingRequest`) returns the nested view-model with
deposits, the fee invoice, and the predecessor/successor frozen numbers.

Write side:

- `createFundingRequestDraft(stageId, kind, input)` / `getFundingRequestDraftInput`
  / `updateFundingRequestDraft` (delete + re-insert lines — a draft is freely
  editable) / `deleteFundingRequestDraft` (draft only).
- **`issueFundingRequest(frId)`** — the atomic Issue transaction:
  1. guard `status = draft`, ≥1 scope line, and the stage has a fee basis
     (+ amount / percent) — else a typed `IssueResult` failure.
  2. `basisValue = Σ material + Σ labour`; `fee` from the stage
     (`fixed` → `fee_amount`; `percent` → `round(fee_percent/100 × basisValue)`).
  3. claim `FR-{project_code}-{NNN}` from `document_number_sequences`
     (`INSERT … ON CONFLICT DO UPDATE … RETURNING next_value - 1`); base number
     is **carried** from the predecessor for a superseding version, with a
     ` v{n}` suffix from v2 on.
  4. append a `fee` category line, freeze `document_snapshot`, set
     `status = issued` + `issued_at`.
  5. raise the Fee Invoice — claim `FI-{project_code}-{NNN}`, own snapshot.
  6. if this request supersedes a predecessor: predecessor → `superseded`
     (+ `superseded_at`); its Fee Invoice — **unpaid** → reissued in place onto
     this version (row id + number kept; nothing was paid, so no double-count);
     **paid** → left untouched, a positive-only **delta** Fee Invoice raised
     (`is_delta`, `parent_fee_invoice_id`). (This is the deliberate reading of
     ticket 09 §1's slightly contradictory "fresh invoice" / "reissued"
     wording — chosen so `computeStageFinancials` needs **no change**: the
     projection sums `fee_invoices` in `('issued','paid')` and would otherwise
     double-count.)
- **`supersedeFundingRequest(frId, { revisionReason })`** — forks a **Draft**
  `version + 1` with `supersedes_id` set and the predecessor's material/labour/
  other lines copied; the predecessor stays `issued` until the fork is itself
  Issued. Only the tip of a chain can be forked.
- **`recordDeposit`** / **`voidDeposit`** — append-only with reversal; deposits
  are allowed against `issued` / `superseded` / `closed` (a deposit against a
  later-superseded version still counts, ticket 09 §1).
- `markFeeInvoicePaid(feeInvoiceId)` — `issued → paid` (wired into the DAL /
  barrel; no dedicated screen yet — the Supervisor Fee ledger UI is a later
  slice, this is here so the projection's `fee_received` can move).
- `src/lib/data/index.ts` — barrel re-exports the 11 funding functions +
  `IssueResult`.

**Cancel of an *issued* request is deferred** — the fee-invoice cleanup makes it
closeout-adjacent (Slice 2.8). A Draft is discarded outright.

### Server Actions — `src/app/actions/funding.ts` (new)

`createFundingRequestAction` (bound `projectId` + `kind`) /
`updateFundingRequestAction` / `deleteFundingRequestDraftAction` /
`issueFundingRequestAction` (plain `void` action — redirects back with an
`?issue_error=` param the detail page surfaces, so no unused `useActionState`
args) / `supersedeFundingRequestAction` / `recordDepositAction` /
`voidDepositAction`. Ids as bound args, never the form body; `revalidatePath`
the overview + funding list + detail, then `redirect`.

### Screens

- `src/app/(app)/projects/_components/FundingRequestForm.tsx` **(new)** — client
  form (shared by new + edit): stage picker (create) or frozen stage label
  (edit), three `RowEditor` sections (Materials / Labour / Other), notes +
  payment instructions. Line rows live in `useState`; the serialized JSON is
  posted in a hidden `lines` field. `useActionState` for the server errors.
- `funding/new/page.tsx` — rebuilt on `getProjectOverview`; `?kind=additional`
  drives the Additional Funding Request copy + bound kind.
- `funding/page.tsx` **(new)** — the Funding Request list.
- `funding/[frId]/page.tsx` **(new)** + `_components/FundingRequestDetail.tsx`
  **(new)** — draft (edit / issue / discard) vs issued (frozen lines, deposits
  panel with record + void, revise/supersede panel, Fee Invoice reference).
- `funding/[frId]/edit/page.tsx` **(new)** — `getFundingRequestDraftInput` → 404
  if not a draft or cross-project.
- `funding/_components/FRStatusBadge.tsx` **(new)** — mirrors `POStatusBadge`.
- `projects/[id]/page.tsx` — a "Funding requests" button in the overview header.
- **Deleted**: `src/lib/funding-mock.ts` and
  `funding/new/_components/FundingRequestBuilder.tsx` (ticket 08 §5).
  `mock-data.ts` stays for the Purchase Order create screen (Slice 2.6 deletes
  it).

## Verify (Windows / CI)

```powershell
cd web
npm run lint          # green in WSL already
npm run typecheck     # green in WSL already
npm run build         # exercises the new pages + Server Actions
npm test              # unchanged isolation suite — no schema change, should stay 30/30
```

Optional manual smoke once `next dev` is up, on a fresh Account:
create project → add a stage **with a fee basis** → Funding requests → Create →
add material + labour lines → Save draft → Edit → Issue → confirm `FR-…-001`
and `FI-…-001`, the overview stage health flips **Blue** (funding pending) →
record a deposit → health leaves Blue → "Start a revision" → issue v2 → v1 shows
Superseded, v2 shows `FR-…-001 v2`.

## Report back

Paste any `lint` / `typecheck` / `build` / `test` failure output. If all green →
Slice 2.5 is done; next is **Slice 2.6** (Purchase Order write lifecycle —
Planned→Ordered Issue txn, append-only Delivery / Payment records with reversal,
over-limit soft-blocks; rebuild `PurchaseOrderBuilder` + `PurchaseOrderDetail`
on the DAL; delete `mock-data.ts` + `funding-mock.ts` — the latter is already
gone here).
