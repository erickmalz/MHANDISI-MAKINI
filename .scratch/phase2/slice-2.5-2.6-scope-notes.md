# Slices 2.5 + 2.6 — Funding Request & Purchase Order write lifecycles — handoff

_Written session 01LbT1zAHEgpdbHab6gWkL6y (2026-09-09). Picking this up in a new
context window. Slices 2.3 + 2.4a are done, verified, pushed, on PR #2._

## The gap this closes

`/projects/[id]/funding/new` and `/projects/[id]/procurement/new` **exist as
routes** but their pages still call `getProject(id)` from `@/lib/mock-data`,
which only knows the three hardcoded sample projects. On a real Account those
ids don't match, so both pages **404**. The overview and procurement list link
to them, so from the preview an Engineer hits a dead end trying to request
funding or raise a PO.

## Current state of the two builders (UI is done, persistence is not)

- `src/app/(app)/projects/[id]/funding/new/_components/FundingRequestBuilder.tsx`
  (~336 lines, `"use client"`) — a 6-step wizard (Stage → Tasks → Materials →
  Labour → Review → Issue). Types/helpers already import from `@/lib/funding`
  (2.3); `tasksForStage` still from `@/lib/funding-mock`. No server writes.
- `src/app/(app)/projects/[id]/procurement/new/_components/PurchaseOrderBuilder.tsx`
  (~348 lines, `"use client"`) — still imports from `@/lib/mock-data` /
  (pre-2.3) mock helpers. No server writes.
- `src/app/(app)/projects/[id]/procurement/[poId]/_components/PurchaseOrderDetail.tsx`
  is already a **read-only** server component on the DAL (2.3). 2.6 adds the
  mutation UI (record delivery / payment, cancel, close) back onto it.

## Schema is fully in place (landed with 2.2 / migration `0003`) — NO migration needed

- `funding_requests` — state enum `draft | issued | superseded | cancelled |
  closed`; `kind` = `base | additional`; `version` + `supersedes_id` +
  `revision_reason`; `base_number` / `display_number` (null while draft);
  `document_snapshot` jsonb; `issued_at`. State machine fixed by ticket 09 §1.
- `funding_request_lines` — `category` enum `material | labour | fee | other`;
  lines entered directly on the FR in v1 (take-off / labour-agreement modules
  deferred, ticket 08 §2). Frozen at Issue.
- `fee_invoices`, `deposits` — raised / recorded by the lifecycle.
- `purchase_orders` — stored status `planned | ordered | cancelled | closed`
  (`POStoredStatus` in `@/lib/procurement`); `display_number` null while
  planned; `document_snapshot`; supplier ack fields; `ordered_at` /
  `cancelled_at` / `closed_at` / `reopened_at`.
- `purchase_order_lines`, `delivery_records` (+ `_lines`), `payment_records` —
  append-only with reversal (`voided_at` + `void_reason`, then a fresh row).
- `document_number_sequences` — per-(project, type) counter. Issue does
  `UPDATE ... SET next_value = next_value + 1 RETURNING next_value - 1`
  (row auto-created at 1). Formatted string (`FR-{project_code}-{008}`) is
  frozen onto the issued record; the table only holds the counter.
  `document_snapshot` jsonb shape: `src/lib/data/schema/snapshot.ts` (loose,
  tightened in 2.7).

## Full speced scope (from the slice ledger)

- **2.5** — Draft→Issued state machine; **atomic Issue transaction**: freeze
  `document_snapshot`, mint `FR-{project}-NNN` + `FI-{project}-NNN` via
  `document_number_sequences`, raise the stage's Fee Invoice, set `issued_at`;
  version/supersede (fork `version+1`, prior row → `superseded`); Additional
  Funding Request (`kind = additional`, own `base_number`, both rows stay
  live); Deposit recording. Rebuild `FundingRequestBuilder` on the DAL.
- **2.6** — Planned→Ordered Issue transaction (freeze snapshot + supplier,
  mint `PO-{project}-NNN`); append-only Delivery / Payment records with
  reversal; over-limit soft-blocks (`over_delivery_reason` §42.12,
  `over_payment_reason` §42.6). Rebuild `PurchaseOrderBuilder` +
  `PurchaseOrderDetail` on the DAL. **Delete `mock-data.ts` + `funding-mock.ts`**
  (ticket 08 §5 — `procurement-mock.ts` already gone in 2.3).

## OPEN DECISION — ask the user first thing

The user paused mid-question to move to a new context window. Re-ask the scope
choice before building:

1. **Draft-first cut for both** — rebuild both builders on the write DAL so an
   Engineer can create / edit / save a **Draft** Funding Request and Draft PO
   against real projects and see them listed. Defer the Issue transaction
   (numbering, snapshot, Fee Invoice, delivery/payment records) to a focused
   follow-up. Fastest to working pages.
2. **Full Slice 2.5 now (funding only)** — complete FR lifecycle incl. Issue,
   version/supersede, Additional FR, Deposit. PO (2.6) next session.
3. **Full 2.5 then full 2.6** — both complete lifecycles this session. Largest
   scope, big diff before anything lands.

Recommendation offered: option 1 or 2. **Funding before PO** regardless — a
PO's material budget checks against the stage's Issued Funding Request lines
(the projection's `remaining*` basis, ticket 08 §2), so funding realistically
comes first; it is also the ledger order.

Also unresolved: keep building on `phase2-domain-structure` / PR #2, or branch.
Default assumption unless told otherwise: **same branch**, one commit per slice
(or per draft-cut + Issue step), same runbook pattern under `.scratch/phase2/`.

## Patterns to reuse (set by 2.2 / 2.3 / 2.4a)

- Write DAL: `withAccount` + RLS, **no `accountId` in any signature**;
  cross-account / missing id → `null` / `[]` / no-op → screen 404s. The Issue
  transaction runs inside the single `withAccount` tx.
- Money columns: `bigint({ mode: "number" })` are numbers; `numeric` columns
  round-trip as **strings** — `Number()` on read, `String()` on write.
- Validation: isomorphic Zod in `src/lib/validation/` (no `server-only`),
  shared by the Server Action parse and the form contract.
- Server Actions: return `ActionState` (`src/lib/forms/action-helpers.ts`),
  `revalidatePath` + `redirect` on success; ids as bound args, never form body.
- All money math through the pure helpers next to `finance.ts` (Phase 1 §51
  "one calculation path").
- Env constraint: WSL runs only `tsc` + `eslint`; `build` / `test` /
  `drizzle-kit` are Windows-side or CI. (No migration this scope, so CI +
  Windows `build`/`test` is the full check.)

## Relevant saved memories

- `mhandisi-makini-supervisor-fee-is-its-own-ledger` — the supervision fee is a
  standalone ledger, **not** a per-task / per-stage cost line. The Fee Invoice
  raised at FR Issue feeds that ledger.
- `mhandisi-makini-issued-documents-need-pdf-and-jpg-export` — every issued
  record (Issued FR, Fee Invoice, Issued PO) must be downloadable as PDF **and**
  JPG. Rendering itself is Slice 2.7, but design the issued-record data so 2.7
  can render it.
- `mhandisi-makini-one-project-at-a-time` — no screen shows multiple projects'
  data together.
- `mhandisi-makini-every-account-starts-empty` — nothing seeded.
