# Stage Financials read model — Decision Map

Architecture decision map. Started 2026-09-26, out of the architecture review
(candidate 1: "One Stage Financials read model"). Resolved in one pass by
taking the recommended answer at every branch, per the user's standing
preference for grilling-based work. **This map produces decisions, not code.**

## Destination

Every SQL read that feeds a money position (Available Float, Client Position,
Supervisor Fee Position, Forecast Funding Requirement, Material Variance) lives
in one module, with one project roll-up, tested against real Postgres through
that module's interface.

## Facts the decisions rest on (verified 2026-09-26)

- `lib/data/projection.ts` `computeStageFinancials(tx, stageId)` runs 5
  queries per stage. It is called by `projects.ts` `buildStages` (sequentially,
  once per stage, for every `getProjectOverview`, which 13 pages and 6 report
  loaders call), and directly by `tasks.ts:236`, `stage-closeout.ts:86,187`,
  `project-closeout.ts:333` and `reconciliation.ts:72`.
- `lib/finance.ts` holds the formulas and is already deep. That is fine.
- The SQL copies:
  - `projects.ts:138` `accumulatedMaterialVarianceTx` copies the take-off
    estimate CASE and the paid-purchases filter at project scope.
  - `reports.ts` `getMaterialCostReport` adds an `estimatedOriginal` query,
    grouped by stage, in a second transaction.
  - `reports.ts:158` writes out "payments" inline, duplicating
    `aggregateStageFinancials`.
- The two roll-ups: `project-closeout.ts:95` `sumFinancials` (it sums all 17
  fields) versus `finance.ts` `aggregateStageFinancials`.
  - **Correction to the review report:** they do not currently disagree on any
    number. Every figure that closeout reads is a linear sum, so it matches, and
    closeout never computes a shortfall. The risk is a second roll-up path
    waiting to drift, not a live mismatch.
- `getLabourReport` is a per-Task listing, which is a different granularity. It
  is not a copy of a money-position read.
- Test infrastructure already exists: Testcontainers Postgres with the role
  split and migrations (`tests/isolation/harness.ts`), plus a CI postgres
  service.

## Decisions

**D1. Module scope.** The module owns every SQL read that produces a
`StageFinancials` figure, or the project total of one:
- the five projection queries;
- the project-scope material variance (`accumulatedMaterialVarianceTx`, which
  gets deleted);
- the Material Cost Report's `estimatedOriginal`.

It does **not** own supplier and subcontractor balances, statements, activity,
or the per-Task labour listing.

**D2. Home and name.** The module is `lib/data/stage-financials.ts`, which
replaces `projection.ts`. It is named after the glossary term Stage Financials
(added to `CONTEXT.md`).

**D3. Interface.** Two functions, both `tx`-scoped because closeout and
reconciliation already run inside their own transaction:

- `readStageFinancials(tx, stageId): Promise<StageFinancials>`
- `readProjectFinancials(tx, projectId): Promise<{ byStage: Map<stageId,
  StageFinancials>; totals: StageFinancials }>`

`totals` is the one roll-up. No caller sums stages by hand.

**D4. One roll-up in `finance.ts`.**
- `finance.ts` gets `sumStageFinancials(list): StageFinancials`, moved from
  `project-closeout.ts`, which deletes its own copy.
- `aggregateStageFinancials` keeps its per-stage floored `forecastShortfall`
  (the non-fungibility rule), gains a `payments` helper, and `reports.ts:158`
  calls that helper.

`finance.ts` stays pure with no I/O. That split, SQL in one module and formulas
in the other, is deliberate: the formulas stay unit-testable without Postgres.

**D5. Accumulated material variance** becomes
`materialVariance(readProjectFinancials(...).totals)`. It is identical by
construction, because both the take-off estimate and paid purchases are linear
per stage. The characterization tests prove this before the old SQL is deleted.

**D6. `StageFinancials` gains `materialEstimatedOriginal`.** The Material Cost
Report then reads it from the overview instead of opening a second transaction.

**D7. Page-facing shape is unchanged.** `getProjectOverview` still returns
`Project.stages[].financials`. `buildStages` reads `byStage` from one
`readProjectFinancials` call.

**D8. Set-based queries come second.** Build in this order:
1. Characterization tests against today's `computeStageFinancials`.
2. Consolidate behind the new interface, with the same queries.
3. Rewrite `readProjectFinancials` as set-based SQL, grouped by `stage_id`
   (about 5 queries per project instead of 5 per stage).

The step 1 tests stay green across steps 2 and 3, following the
replace-don't-layer rule.

**D9. Test seam.**
- `tests/financials/*.test.ts` boots the harness DB, seeds one Account's rows
  as `mhandisi_owner`, and opens an `app_runtime` transaction with
  `app.current_account_id` set.
- The tests call `readStageFinancials` / `readProjectFinancials` directly.
- `server-only` is aliased to an empty module in `vitest.config.ts`.

Cases to cover:
- Purchase Orders: ordered, closed and cancelled; a voided payment; an
  overpaid order floored at zero.
- Deposits: a voided deposit, and a deposit on a superseded Funding Request
  version, which still counts.
- Take-off lines: revised versus original, and a Variation-appended negative
  line.
- Fees: a draft fee versus an issued fee, and paid versus issued Fee Invoices.
- A pending Funding Request.
- Two stages, where a surplus stage does not offset a shortfall stage.
- A second Account's rows, which are invisible.

**D10. Out of scope, recorded:**
- Whether Project Closeout should read the frozen Stage Closeout snapshots
  instead of re-deriving live figures (the open note at
  `project-closeout.ts:399`). It stays live for now.
- Deepening `withAccount` (review candidate 3).

**D11. Fixed separately, first:** `export.ts:118` runs `Promise.all` over one
`tx`. That is the f7b8465 bug class, fixed by making the reads sequential. It
gets its own commit.

## Build status

- [x] D11: `export.ts` reads made sequential (`f32c7ca`).
- [x] D1–D7, D9: module, one roll-up, callers moved, characterization
      tests written (`55f9bd9`).
- [x] D8 step 3: set-based queries. Both reads share four queries that
      differ only in their stage filter.
- [ ] `tests/financials` not yet run: Docker isn't available in this WSL
      distro. It needs to be run locally with Docker, or in CI, before merge.
      Tests run against `55f9bd9` first check the old queries; tests run at the
      head of the branch check the set-based ones.
