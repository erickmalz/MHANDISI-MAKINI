# Slice 4.5 — Advanced Reporting Dashboard — runbook

**Built — pending integration + CI verification**

## What changed

Implements ticket 06 (`.scratch/phase4/issues/06-advanced-reporting-dashboard.md`)
in full: six live, read-only, per-project report screens (guidelines §38,
minus Supplier/Subcontractor Statements — already shipped, Operational
Control decision 5 — and minus the Stage Closeout Report, ticket 03's own
sibling slice).

### Schema — no migration

None needed and none made. This ticket is pure read/presentation over
Phase 1–3 tables; no new column or table was required, matching the
ticket's own "Hard constraints."

### DAL — `web/src/lib/data/reports.ts` (new)

One file, six exported functions, each taking a single `projectId` and
returning `null` for a missing/cross-account project (same convention as
every other DAL read):

- `getProjectFinancialSummary(projectId)`
- `getMaterialCostReport(projectId)`
- `getProcurementReport(projectId)`
- `getLabourReport(projectId)`
- `getFundingReport(projectId)`
- `getVariationReport(projectId)`

Barrel export added to `web/src/lib/data/index.ts` (all six functions +
their row/report types), following the existing pattern of every other DAL
module.

### Screens — `web/src/app/(app)/projects/[id]/reports/`

- `page.tsx` — the reports index/landing page, linking to all six reports.
- `financial-summary/page.tsx`, `material-cost/page.tsx`,
  `procurement/page.tsx`, `labour/page.tsx`, `funding/page.tsx`,
  `variations/page.tsx` — one route per report, each a server component
  calling its DAL function and rendering a table (or, for Financial Summary,
  stat tiles plus a stage-by-stage table), following the existing
  `overflow-x-auto` + `<table>` pattern from `material-stock/page.tsx` and
  the `Card`/`Money`/`StatTile` components used across the app.
- Status pills reuse the existing `POStatusBadge`, `FRStatusBadge` and
  `VariationStatusBadge` components via cross-route relative imports (the
  same pattern `stages/[stageId]/page.tsx` already uses for
  `VariationStatusBadge`) — no new badge components.

### Nav

`web/src/app/(app)/projects/[id]/page.tsx` gets one new secondary "Reports"
button (Phosphor `ChartBar`) next to the existing Material stock / Purchase
orders / Funding requests buttons, linking to `/projects/{id}/reports`.

## Per-report reuse vs. new computation

- **Project Financial Summary** — 100% reuse: sums `getProjectOverview`'s
  already-computed per-stage `StageFinancials` through `@/lib/finance`'s
  existing `availableFloat`, `totalCommitted`, `forecastFundingRequirement`,
  `feeOutstanding`, `financialHealth`, plus `listFundingRequests` +
  `@/lib/funding`'s `depositTarget`/`depositedTotal` for the funding
  requested/received totals. No new formula — only project-level summation
  of stage-level figures (the same trade-off `getAccumulatedMaterialVariance`
  already makes for Material Variance).
- **Material Cost Report** — mostly reuse: `estimatedRevised`/`actual`/
  `variance` are `StageFinancials.materialEstimated`/`paidPurchases` and
  `@/lib/finance`'s `materialVariance`, unchanged. One new figure:
  `estimatedOriginal` (the *original*, never-revised take-off total per
  stage) — no existing projection isolates it from the current
  revised-if-set estimate, so this is one small new grouped SQL query.
- **Procurement Report** — 100% reuse of `listPurchaseOrders` plus
  `@/lib/procurement`'s existing pure derivations (`orderedTotal`,
  `acceptedValue`, `paidTotal`, `outstandingValue`, `derivePOStatus`).
  "Required" reuses the project's summed `materialEstimated`. No new
  calculation.
- **Labour Report** — one new query: no existing DAL function lists every
  Task across every stage of a *project* in one call (`listTasksForStage` is
  per-stage, `getSubcontractorStatement` is per-subcontractor account-wide).
  The agreed/paid/outstanding arithmetic itself is unchanged — identical to
  `computeStageFinancials`'s own labour query and
  `getSubcontractorStatement`'s task rows, just assembled at project scope.
- **Funding Report** — 100% reuse: `listFundingRequests` run through
  `@/lib/funding`'s existing `deriveFRStatus`, `depositTarget`,
  `depositedTotal`, `depositOutstanding` — the same functions the Funding
  Requests list screen already calls. Zero new calculation.
- **Variation Report** — mostly reuse: calls the existing
  `listVariationsForStage` (Phase 3 ticket 01) once per stage and flattens,
  rather than duplicating its join/assembly logic; approval status is the
  raw stored `VariationStatus` (the existing `VariationStatusBadge`
  component renders its label); the "Funded" derivation is
  `@/lib/variations`'s `isVariationFunded`, unchanged. One small new
  roll-up: `additionalCost = materialImpact + labourImpact` per row, and the
  4-way funding-status label (not applicable / not linked / funding pending
  / funded) built from data `listVariationsForStage` already returns.

## Deviations / judgment calls

- **Material Cost Report granularity is per-stage, not per-line.**
  `@/lib/finance`'s own doc comment on `materialVariance` is explicit that
  there is no stable key between a free-text Material Take-Off line and a
  free-text Purchase Order line, so "Actual"/"Variance" cannot be shown any
  finer than stage level — same posture Budget Variance Analysis (Phase 3
  ticket 03) already took.
- **"Available Float" and "Forecast shortfall" project totals are informational
  aggregates, not new fungible pools.** Deposits are Funding-Request- (hence
  stage-) scoped by construction (`computeStageFinancials`), so one stage's
  surplus float can't actually cover another stage's shortfall. The
  Financial Summary sums `max(0, forecastFundingRequirement)` per stage for
  the headline shortfall figure (so a healthy stage never silently cancels
  out an underfunded one) and documents the raw float sum as
  informational — the stage-by-stage table is the figure to act on. This
  doesn't reopen the one-project-at-a-time rule: everything stays scoped to
  stages *within* the single open project, never across projects.
- **Funding Report totals exclude Draft and Cancelled requests** — nothing
  has actually been asked of the client for a Draft, and a Cancelled request
  never will be.
- **Procurement Report totals exclude Cancelled orders**, matching the same
  rule `getSupplierStatement`'s `outstandingBalance` already follows.

## Verify

```bash
cd web
npm run typecheck   # clean
npm run lint        # clean
```

Both ran clean in this worktree (`npx tsc --noEmit` via `next typegen &&
tsc --noEmit`, and `eslint` with no args — the exact `package.json`
scripts). `npm run build` / `npm test` / CI were not run from this
worktree — left for the integration/CI pass this file's header names.

No migration generated or needed — confirmed by inspection (no schema file
touched; `web/src/lib/data/schema/` is unchanged in this diff).

## Files changed

- `web/src/lib/data/reports.ts` (new) — the six report DAL functions.
- `web/src/lib/data/index.ts` — barrel export for the six functions + types.
- `web/src/app/(app)/projects/[id]/reports/page.tsx` (new) — reports index.
- `web/src/app/(app)/projects/[id]/reports/financial-summary/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/reports/material-cost/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/reports/procurement/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/reports/labour/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/reports/funding/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/reports/variations/page.tsx` (new)
- `web/src/app/(app)/projects/[id]/page.tsx` — one new "Reports" nav button.

## Open questions

- None blocking. The ticket left exact routing/report granularity to the
  builder's judgment ("your call"); the choices above (stage-level Material
  Cost Report, per-PO Procurement Report with a project-wide "Required"
  figure, per-task Labour Report, thin pass-through Funding/Variation
  reports) are recorded here for the integration pass to review.
- This slice touches no file shared with the other four parallel Phase 4
  slices (no schema barrel, no `web/src/lib/documents/` change) — as the
  ticket predicted, merge risk should be effectively zero. Confirmed by
  `git status`: only `web/src/lib/data/index.ts` and
  `web/src/app/(app)/projects/[id]/page.tsx` are pre-existing files touched,
  both narrow, additive edits (nav button; barrel export block).
