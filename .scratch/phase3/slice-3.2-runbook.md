# Slice 3.2 — Budget Variance Analysis — runbook

> **Verified 2026-09-14** — CI run `34879650958` on PR #4 green: `lint`,
> `typecheck`, migrations, the Testcontainers isolation suite and
> `npm run build` all ✓.

## What changed

Implements ticket 03 (`.scratch/phase3/issues/03-budget-variance-analysis.md`)
in full, on top of Slice 3.1's Variation module.

### Schema — no migration

`material_lines.qty_revised` / `est_unit_cost_revised` were already present
(added ahead of need in migration `0002_domain_structure`) but unused —
ticket 03 activates them; it adds no columns. Confirmed by generating against
the isolated-Linux-`drizzle-kit` scratch procedure (throwaway copy of
`package.json` + `drizzle.config.ts` + `src/lib/data/schema/` + `drizzle/`,
`npm install --ignore-scripts`, `npx drizzle-kit generate`): output was
**"No schema changes, nothing to migrate"** — zero drift, no migration
generated or committed. The next migration number therefore stays `0009_*`
for whichever slice needs it next.

### DAL — `src/lib/data/tasks.ts`

- **Freeze point**: `stageBudgetLocked` (unchanged, reused as-is) — a stage's
  Funding Request issued/closed.
- **Pre-lock**: take-off edits stay delete-and-reinsert, but the delete and
  the read for the edit form now filter `variation_id IS NULL` — an
  approved Variation's synthetic material line (Slice 3.1) can be appended to
  a Task on an *unlocked* stage too, and must never be deleted by an
  unrelated Task edit or matched against by the per-line diff. This was a
  latent gap in the pre-3.2 code (the old delete had no such filter); fixing
  it was required by this ticket's own cross-reference note, not scope creep.
- **Post-lock**: `applyLockedTakeOffEdits` (new) — a true per-line diff over
  a Task's *ordinary* (`variation_id IS NULL`) lines:
  - A submitted line whose `id` matches an existing row revises it: writes
    `qty_revised`/`est_unit_cost_revised` **only when the submitted figure
    actually differs** from the line's current one (revised if already
    revised, else original) — re-saving an unchanged line manufactures no
    spurious revision. `*_original` is never touched.
  - A submitted line with no `id` (or an `id` not among this task's own
    rows) is new: inserted with `*_original` left `NULL`, only `*_revised`
    set — the material-line mirror of `labourOriginal` staying unset.
  - An existing row whose `id` is missing from the submission was dropped in
    the form: recorded as `qty_revised = '0'`, never deleted.
  - Item/unit are immutable on an existing (has-`id`) line once locked —
    only qty/cost can be revised; a brand-new post-lock line's item/unit are
    fully free (see "Deviations" below).
- `getTaskInput` now returns only ordinary lines in `lines` (each carrying
  `id`, current `qty`/`estUnitCost` via the new `qtyOriginal`/`estUnitCost
  Original` pair-fallback, plus `qtyOriginal`/`estUnitCostOriginal` for the
  form's "Original: …" hint), and a separate `variationMaterialTotal` (Σ
  current estimate of the task's Variation-tagged lines, shown read-only on
  the form, never editable there).
- `getStageDetail` now also returns `financials: StageFinancials` (computed
  in the same transaction) — the Stage page no longer needs a second query
  for the Budget Variance card.

### View model — `src/lib/tasks.ts`

- `currentTakeOffFigures(row)` (new, exported): the one place the
  "revised pair where a line has one, else the original pair" fallback
  (ticket 03 §3) is implemented — used by `assemble()` (list/detail display),
  `getTaskInput` (edit form), and independently mirrored in raw SQL inside
  `computeStageFinancials`/`getAccumulatedMaterialVariance` (can't share a JS
  function across the SQL boundary; kept deliberately identical).
- `MaterialTakeOffLine` gains `variationId`, `qtyOriginal`,
  `estUnitCostOriginal`; `qty`/`estUnitCost` now carry the *current* figure
  rather than always the original. `lineEstimate`/`estimatedMaterialCost` are
  unchanged in signature — they now correctly include revisions and
  Variation-tagged lines because the inputs they read already do.

### Projection — `src/lib/data/projection.ts`

- `computeStageFinancials` gains two additive fields: `materialEstimated`
  (Σ every take-off line under the stage's Tasks, current figures, via one
  SQL aggregate) and `labourAgreementTotal` (Σ current labour agreement
  across the stage's Tasks, unfloored — folded into the existing labour
  loop). Both are raw sums, not variances.

### Finance — `src/lib/finance.ts` (the "one authoritative calculation path", guidelines §51)

- `materialVariance(f)` = `f.materialEstimated - f.paidPurchases`.
- `labourVariance(f)` = `f.labourAgreementTotal - f.labourPayments`.
- `budgetVarianceTotal(f)` = `materialVariance(f) + labourVariance(f)`.

Positive = saving, negative = overspend, for both.

### Project-level — `src/lib/data/projects.ts`

- `getAccumulatedMaterialVariance(projectId)` (new) — ticket 03 §5's
  "credited to Petty Cash" figure: Σ Material Variance across every stage of
  the project, one SQL aggregate (not a loop over `computeStageFinancials`
  per stage), live-computed, **never stored**. No schema change, no new
  Petty Cash ledger event — `petty_cash_expenses` is untouched.

### Screens

- **`src/app/(app)/projects/[id]/stages/[stageId]/_components/BudgetVarianceCard.tsx`**
  (new) — the combined Budget Variance card: Material (Estimated / Actual /
  Variance) and Labour (Agreement / Paid / Variance) side by side, a combined
  total row, and the project-wide Accumulated Material Variance row. Added to
  the existing stage detail page (`stages/[stageId]/page.tsx`), no new route.
- `src/app/(app)/projects/_components/TaskForm.tsx` — the take-off section
  reworked for post-lock editing: item/unit inputs are `readOnly` only for an
  existing line while locked (`identityLocked = budgetLocked && !!row.id`);
  qty/cost are always editable; Add and Remove are always shown (Remove on an
  existing locked line simply excludes its `id` from the submission, which
  `applyLockedTakeOffEdits` reads as "dropped" and zeroes); an
  "Original: …" caption appears under a line once its current figure differs
  from what was recorded before lock; a footer note shows
  `variationMaterialTotal` when non-zero, so the form's own subtotal (which
  excludes Variation-tagged lines) doesn't read as inconsistent with the
  stage page's per-task "Material estimate" figure (which includes them).

## Deviations from the ticket's prose

- **`materialVariance`/`labourVariance` are `finance.ts` pure functions, not
  stored `StageFinancials` fields.** The ticket's literal wording is
  "`computeStageFinancials` gains a `materialVariance` … in its return
  shape." Storing the *raw sums* (`materialEstimated`, `labourAgreementTotal`)
  on `StageFinancials` and deriving the variance figures via `finance.ts` —
  exactly the pattern every other derived figure in this codebase already
  follows (`availableFloat`, `forecastFundingRequirement`, etc., guidelines
  §51 "one authoritative calculation path") — was the more consistent choice,
  and it's what a Labour Variance actually needs: `labourAgreementTotal` is
  *unfloored*, unlike the existing `openLabourCommitments` (which floors at
  0 and would silently hide an overspend if used to back into an agreement
  total). Downstream slices should call `materialVariance(f)` /
  `labourVariance(f)` / `budgetVarianceTotal(f)`, not a field.
- **Item/unit freeze post-lock on an existing line; the ticket only names
  qty/cost as revisable.** Ticket §2 says "editing an existing line's
  qty/cost is a true UPDATE… writing `*_revised` only," which implies (but
  doesn't explicitly forbid) item/unit staying fixed. Freezing them was the
  deliberate, conservative reading — there's no `*_revised` column for
  item/unit to route a rename through, and allowing a silent identity change
  on a client-facing estimate line post-lock is exactly the risk decision 3
  exists to prevent. A brand-new post-lock line has no such restriction.
- **The pre-existing pre-lock delete-and-reinsert path was also fixed to
  exclude `variation_id IS NOT NULL` rows**, not just the new post-lock path.
  This wasn't explicitly asked for by ticket 03's prose but is required by
  its own cross-reference note (a Variation-appended row must never be
  treated as an ordinary take-off line by *any* Task-edit write path, not
  only the locked one) — and it closes a real bug: before this slice, editing
  a Task's take-off on an unlocked stage would have deleted that Task's
  Variation-appended line along with everything else.
- **Accumulated Material Variance has one display location, not two.** The
  ticket says it's "shown alongside Petty Cash Expenses (and on the Budget
  Variance card)" — but no Petty Cash Expenses screen exists anywhere in this
  codebase yet (Phase 1/2/Operational Control never built one; it's read only
  into `availableFloat`). Rather than invent a new screen out of scope for
  this ticket, the figure is shown only on the Budget Variance card, labelled
  "(project-wide)" to distinguish it from the stage-scoped figures beside it.
- **`variationMaterialTotal` on the Task edit form** is an addition beyond
  the ticket's literal scope (a small UX guard, not a decision item) — it
  exists purely so the form's own material-estimate subtotal (which
  necessarily excludes Variation-tagged lines, since those never appear in
  the editable list) doesn't read as silently smaller than the stage page's
  per-task total (which includes them).

## Interface for downstream slices (3.3, 3.4, 3.5)

- **The stage-level variance figures**: `src/lib/finance.ts` —
  `materialVariance(f: StageFinancials)`, `labourVariance(f)`,
  `budgetVarianceTotal(f)`. Feed them a stage's `StageFinancials` (from
  `getStageDetail(stageId).financials` or `getProjectOverview(projectId)
  .stages[].financials`, both already computed via
  `computeStageFinancials`).
- **The rendered card**: `src/app/(app)/projects/[id]/stages/[stageId]
  /_components/BudgetVarianceCard.tsx` — `BudgetVarianceCard({ f:
  StageFinancials, accumulatedMaterialVariance: number })`. Ticket 05 (Stage
  Closeout, Slice 3.4) can import and re-render this component read-only on
  its own screen, or just call the three `finance.ts` functions directly if
  it only needs the numbers.
- **Project-wide figure**: `src/lib/data/projects.ts` —
  `getAccumulatedMaterialVariance(projectId): Promise<number>`, exported from
  `@/lib/data`.
- **`material_lines.variation_id IS NOT NULL`** rows are excluded from every
  take-off read/write path in `tasks.ts` (`getTaskInput`'s `lines`,
  `applyLockedTakeOffEdits`, both `updateTask` delete branches) but **are**
  included in every stage-/project-level SUM (`computeStageFinancials`'s
  `materialEstimated`, `getAccumulatedMaterialVariance`, and `assemble()`'s
  per-task display total) — downstream slices reading variance/estimate
  totals get Variation impact automatically; downstream slices touching the
  take-off write path must keep excluding them.

## Verify

```bash
cd web
npm run typecheck   # clean in WSL
npm run lint        # clean in WSL
```

No migration generated (confirmed via the isolated-Linux-drizzle-kit
procedure — see "Schema" above). `db:migrate` / `npm test` / `npm run build`
verified via CI run `34879650958` on PR #4 (green: migrations, `lint`,
`typecheck`, the isolation suite, and `build` all ✓).

## Report back

Commit `1a23e59` on `phase3-change-forecast-control`; PR #4
(`https://github.com/erickmalz/MHANDISI-MAKINI/pull/4`); CI run
`34879650958` green. No migration needed — confirmed by the isolated
drizzle-kit diff ("No schema changes, nothing to migrate"). Slice 3.2 is
done; next is **Slice 3.3** (Material Stock ledger, ticket 06).
