# Mock-data cutover and the tenant-scoped data-access layer

Type: grilling
Status: open
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

Resolve by fixing the data-access layer's shape, where the financial figures are
computed, and what happens to the mock files.
