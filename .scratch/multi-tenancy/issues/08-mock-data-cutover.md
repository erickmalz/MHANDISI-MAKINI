# Mock-data cutover and the tenant-scoped data-access layer

Type: grilling
Status: resolved
Blocked by: 05

## Question

Today `web/src/lib/mock-data.ts` serves three hardcoded projects to everyone,
and `getProject` / `getCurrentStage` / the finance helpers read straight from
that array — the app is read-only. Decide how this becomes real per-Account
data.

- **The data-access seam**: `getProject(id)`, `getCurrentStage(project)`,
  `allPurchaseOrders(project)`, `tasksForStage(stage)` etc. all become
  account-scoped lookups against the store. Decide the shape of that layer — a
  single module every screen imports from — so ticket 06's enforcement has one
  funnel.
- **What the finance helpers consume**: `finance.ts` takes plain
  `StageFinancials` objects. Confirm those figures come from stored records
  (deposits, purchase orders, payments, fee invoices) computed per request, vs.
  stored denormalised — this is where the Phase 1 "one authoritative
  calculation path" rule meets a database.
- **The mock files' fate**: `mock-data.ts`, `funding-mock.ts`,
  `procurement-mock.ts` — deleted, or repurposed as the seed for a sample
  project on a new Account (ties to ticket 02's first-run answer)?
- **Slugs vs ids**: routes use slugs (`mbezi-beach-residence`); per-Account
  these must be unique only within the Account, or move to ids (ties to
  ticket 06).
- **Scope line**: this ticket decides the *model and the seam*. Building the
  create/edit screens and wiring every mutation is the downstream effort —
  confirm that boundary.

**Constraint from ticket 05 (data-store category):** the store is **standard
co-located PostgreSQL accessed through Drizzle**, and ticket 05 already fixed
that a **single `server-only` data-access layer** is the primary path (with
Postgres RLS as the backstop beneath it). So this ticket designs *that* funnel
concretely — the module shape, the Drizzle queries, how `getProject` etc.
become account-scoped through it — rather than choosing whether to have one.
Ticket 02's first-run answer ("nothing seeded") already constrains the mock
files' fate away from "seed a sample project."

Resolve by fixing the data-access layer's shape, where the financial figures are
computed, and what happens to the mock files.

## Answer

### The inversion

Today the model runs backwards: `StageFinancials` is a stored bag of pre-computed
totals, and `funding-mock.ts` / `procurement-mock.ts` synthesise fake Purchase
Orders and Tasks *from* those totals so the screens have something to render. The
real model inverts this — **store the atomic records, derive every total per
request.**

### 1. Computed per request, never materialised

Store only atomic records: Deposit, Funding Request (+ lines), Fee Invoice,
Purchase Order (+ lines, deliveries, payments), Labour Agreement (+ payments),
Petty Cash Expense, Variation. A single `server-only` **projection function**
assembles each `StageFinancials` by summing those records (in SQL where it is a
plain total), inside the one RLS transaction per request.

- `finance.ts` is **unchanged** — it still takes a plain `StageFinancials` and
  derives Available Float, Total Committed, Forecast Funding Requirement, the
  Financial Health Indicator, and the Supervisor Fee Position. The Phase 1 §51
  "one authoritative calculation path" rule is preserved because the totals *are*
  the records summed; they cannot drift.
- `fundingRequestPending` becomes **derived** (an Issued Funding Request for the
  stage with no matching Deposit yet).
- **No denormalised stage totals in v1.** Revisit only on a real profiling
  problem, and never as the only copy.

### 2. The `remaining*` basis

The Funding Request is the anchor for "what this stage was scoped to cost":

- `remainingFee` = Σ(stage Funding Request fee lines) − Fee Invoiced.
- `remainingMaterial` = Σ(stage Funding Request material lines) − (Open + Paid
  Purchase Commitments for the stage), floored at 0.
- `remainingLabour` = Σ(stage Funding Request labour lines) − (Open Labour
  Commitments + Labour Payments for the stage), floored at 0.
- `remainingOtherApproved` = approved Variations not yet realised as a PO /
  Labour Agreement / Petty Cash Expense (matches the CONTEXT.md Available Float
  note).

Material/labour lines are entered **directly on the Funding Request** in v1 — the
separate take-off / labour-agreement module stays deferred. Before any Funding
Request exists for a stage, the `remaining*` figures are zero and the stage reads
as *unscoped*, not fully funded.

### 3. The data-access layer

One `server-only` module at `web/src/lib/data/`, exposing **intent-named domain
functions** — `getProjectOverview(projectId)`, `listProjects()`,
`listPurchaseOrders(projectId)`, `getPurchaseOrder(poId)`,
`getFundingWorksheet(stageId)`, and the write functions — **not** a generic query
builder and **not** a repository-per-table.

- **No `accountId` parameter on any signature.** The account filter is injected
  by the transaction wrapper ticket 06 builds (`SET LOCAL` from request context,
  Postgres RLS beneath). A caller physically cannot pass the wrong account.
- Screens and components **never import Drizzle directly** — this module is the
  single funnel ticket 06 wraps.
- **Read functions return the existing nested view-model**: a `Project` with
  `stages: Stage[]`, each carrying a freshly-computed `financials:
  StageFinancials`, plus the resolved current stage. The entire `src/components`
  and screen layer is untouched by the cutover — only the import source changes
  from `@/lib/mock-data` to `@/lib/data`.
- `currentStageId` stays a **stored, editable column** on the project.
- Reads and writes both go through this module; the transaction-wrapper pattern
  is fixed here.

This also settles the "project picker / current project under tenancy" map fog:
`listProjects()` is RLS-scoped to the Engineer's own projects; "current project"
is the route's project id (no server-side session state); the AppChrome "Switch
project" flow is unchanged (a link back to the picker).

### 4. Alerts are derived

`Project.alerts` becomes a **computed view** over records in the projection
function (negative float, positive Forecast Funding Requirement with no pending
request, Delivered-but-unpaid PO, delivery with no delivery note, …). No `alert`
table, no write path. The exact rule catalogue is build-time detail.

### 5. Mock files: deleted

`mock-data.ts`, `funding-mock.ts`, `procurement-mock.ts` are **deleted from
`src/`** when the DAL lands. No dev-seed script — a developer creates a real
Account through the normal signup + create-project flow (ticket 02). Promoted out
first:

- Genuine domain **types** → the Drizzle schema / `types.ts`: `PurchaseOrder`,
  `POStatus`, `POMaterialLine`, `DeliveryRecord`, `PaymentRecord`,
  `PaymentMethod`, `PaymentType`, `TaskLine`, `MaterialLine`, `LabourLine`.
- Pure domain **helpers** → alongside `finance.ts`: `orderedTotal`,
  `acceptedValue`, `paidTotal`, `outstandingValue`, `derivePOStatus`,
  `materialTotal`, `labourTotal`.
- Thrown away: the deterministic generators (`purchaseOrdersForStage`,
  `tasksForStage`), the `MATERIAL_SETS` / `TASK_NAMES_BY_STAGE` fixtures, and the
  per-project `NUMBER_OVERRIDES` / `NOTE_OVERRIDES`.

### 6. Ids: recommendation to ticket 06

Routes should move to **opaque UUIDv7 ids** (matching `account_id` from ADR
0002); drop the human-readable slugs (`mbezi-beach-residence`). This is ticket
08's input — **ticket 06 owns the final decision** alongside the 404-vs-403 rule.

### 7. Scope line

**This ticket fixes:** the table list (ticket 01's record inventory as real
tables) and their key relationships (`account_id` on every row; Project → Stage →
Task; PO → lines → deliveries → payments; Funding Request → lines; Fee Invoice;
Deposit; Labour Agreement → payments; Petty Cash Expense; Variation), the
stored-vs-computed split, the DAL module boundary and its transaction-wrapper
pattern, and the mock cutover.

**Handed to the build effort:** the column-by-column Drizzle DDL (worked from
this table list), the enumeration of every mutation, and all create/edit screens.
Drizzle schema lives at `web/src/lib/data/schema.ts`; `drizzle-kit` migrations
checked into the repo (ticket 05).

**Still map fog:** the persisted lifecycle of the "issue" actions (Funding
Request "Issue to client", PO "Issue", "Record delivery / payment") — graduated
to ticket 09.
