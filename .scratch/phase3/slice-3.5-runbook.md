# Slice 3.5 — Financial Reconciliation Engine ("Run Financial Check") — runbook

> **Verified 2026-09-15** — CI run `34908958723` on PR #4 green: `lint`,
> `typecheck`, migrations, the Testcontainers isolation suite and
> `npm run build` all ✓.

## What changed

Implements ticket 04
(`.scratch/phase3/issues/04-financial-reconciliation-engine.md`) in full, on
top of Slices 3.1–3.4's schema/DAL.

### Schema — no migration

Pure computation over existing tables — no new column, no new table.
Confirmed via the isolated-Linux-`drizzle-kit` scratch procedure (throwaway
copy of `package.json` + `package-lock.json` + `drizzle.config.ts` + `src/` +
`drizzle/`, `npm install --ignore-scripts`, `npx drizzle-kit generate`):
output was **"No schema changes, nothing to migrate"** — zero drift, no
migration generated or committed. The next migration number stays `0010_*`
for a future slice.

### View model — `src/lib/reconciliation.ts` (new, no `server-only`)

Pure, client-safe, mirrors `src/lib/stage-closeout.ts`:

- `ReconciliationSeverity` (`info | warning | critical`, a finding's own
  recorded severity) vs. `ReconciliationStatus` (`passed | warning |
  critical`, a check's tally rollup) — kept distinct so an `info` finding can
  still be shown in full without costing its check "Passed" status
  (guidelines §34: the tool is "informational, not an accounting
  certification").
- `ReconciliationFinding` / `ReconciliationCheck` / `ReconciliationReport`.
- `reconciliationRowStatus(findings)` — critical if any finding is critical,
  else warning if any is warning, else passed.
- `reconciliationScore(passed, warnings, critical)` — ticket 04 §2's formula,
  `round(100 * (Passed + 0.5*Warnings) / (Passed+Warnings+Critical))`;
  returns 100 for a zero-check stage rather than `NaN`.

### DAL — `src/lib/data/reconciliation.ts` (new)

**`getStageReconciliationReport(stageId): Promise<ReconciliationReport |
null>`** — the single entry point, `withAccount`-wrapped, computed fresh on
every call (no stored result, same posture as `computeStageFinancials`):

1. Loads the stage row + `computeStageFinancials` (same figures every other
   stage screen reads).
2. Builds the `Stage` view-model `deriveProjectAlerts` expects, calls it,
   then calls `computeStageAlerts(tx, projectId, stageId)` — **the existing
   Alerts logic is never re-derived**, only folded into the tally.
3. Folds every alert *family* the two functions can produce into one tally
   row apiece via `ALERT_FAMILIES` (a family strips a per-record id suffix,
   e.g. every `po-overdue-{id}` collapses to one row) — a family with no
   firing instance this call is Passed; one with an instance takes that
   instance's worst severity, with every instance's message kept as a
   finding. This intentionally folds in the **whole** Alerts output, not
   just the ids that map onto one of the guideline's 17 named checks (ticket
   04 §4's literal instruction) — so `funding-request-pending`,
   `fee-outstanding`, `material-not-ordered`, etc. (Operational Control's own
   extra ambient signals) get a tally row too, alongside the ones that do map
   onto a numbered guideline check (1&15, 7, 9, 10, 11, 14).
4. Adds 5 more checks as their own functions, run inside the same
   transaction: `overPaymentVisibilityCheck` (check 5), 
   `unexplainedLabourBalanceCheck` (check 8), 
   `duplicatePaymentReferenceCheck` (check 13), 
   `procurementVsMaterialRequirementCheck` (check 6, residual), 
   `staleVariationsCheck` (check 16, residual).
5. Tallies Passed/Warnings/Critical across every row (an `info`-only row
   counts toward Passed) and computes the score.

Exported from `@/lib/data` as `getStageReconciliationReport`.

### The 5 new/residual checks, in detail

- **Check 5 — over-payment visibility**: any non-cancelled Purchase Order on
  the stage whose `paid_total > ordered_total`, with its most recent
  `over_payment_reason` (payment_records already soft-blocks an over-payment
  without one, guidelines §42.6). Severity **info** — "a conscious decision,
  not a bug," per the ticket.
- **Check 8 — per-task unexplained labour balance**: every `Task` on the
  stage with `status = 'completed'` whose `agreement − paid > 0`, named
  individually (the itemised counterpart to the existing stage-level
  `stage-complete-labour-outstanding` alert, which stays as its own row via
  `ALERT_FAMILIES`). Severity **warning**.
- **Check 13 — duplicate payment references**: a self-join on
  `payment_records.reference` (non-null, non-empty, non-voided), scoped from
  this stage's own payments but matching account-wide (RLS already confines
  the match to this Account) — the message names the other half of the pair
  by its Purchase Order and, when it's on a different stage, that stage and
  project. De-duplicated by sorted id-pair so a reciprocal match (both
  payments on this same stage) isn't listed twice. Severity **warning**.
- **Check 6, residual (map.md "Not yet specified")** — "procurement does not
  exceed material requirements without explanation": no per-item key exists
  between Material Take-Off lines and Purchase Order lines (Slice 3.2
  confirmed `materialVariance` stays stage-level), but that same stage-level
  figure already includes every approved Variation's material impact (Slice
  3.1/3.2's own interface note). So a **negative** `materialVariance(f)` —
  actual purchase cost exceeding the estimate, Variations already folded in —
  *is* exactly "procurement exceeding requirements with nothing on file to
  explain it." Pure function, no query, reuses the stage's already-computed
  `StageFinancials`. Severity **warning**.
- **Check 16, residual (map.md "Not yet specified")** — "variations without
  approval are identified": implemented as ticket 04's own recommended shape
  once Slice 3.1 landed — any Variation on the stage sitting in `status =
  'draft'` for more than `VARIATION_STALENESS_DAYS` (14) since
  `requested_at`. The concern is an *undecided* Variation, not an
  "unapproved" one silently affecting money — a Draft Variation has zero
  financial effect until Approved, by construction (Slice 3.1). Severity
  **warning**.

### Guideline check 17 — deliberately not built here

Per the explicit build brief (citing `.scratch/phase3/slice-3.4-runbook.md`'s
own "Interface for downstream slices" section): Slice 3.4's four Stage
Closeout gates (no open Task, no non-terminal Variation, no `ordered`
Purchase Order, zero Open Labour Commitments) already make it structurally
impossible for a stage to reach `completed` with an unresolved commitment,
and nothing in this codebase can move a `completed` stage back out of that
status. This is the same posture as guideline checks 2–4 (structurally
guaranteed, not a runtime check) — no `checkSeventeen` function exists, and
none is needed. Ticket 04's own text floated a "defensive re-check" for
drift (e.g. a payment voided after closeout), but 3.4's runbook already
confirms — as built, not just as decided — that the gates hold; adding a
redundant re-check here would just be a second, driftable copy of the same
guarantee.

### Screens

- **`src/app/(app)/projects/[id]/stages/[stageId]/financial-check/page.tsx`**
  (new) — the report view: a back-link to the stage, a 4-tile row
  (Reconciliation Score / Passed / Warnings / Critical Issues, colour-coded
  green/amber/red — matching the guideline's own worked-example layout), a
  "Critical Issues" card (only rendered if non-empty), a "Warnings" card
  (same), then a "Passed" card listing every passed check's label plus any
  `info`-severity findings folded into it (so check 5's over-payment note
  and the Alerts feed's `info`-severity items, e.g. `fee-outstanding`,
  `unallocated-deposit`, `po-missing-receipt-*`, are still visible even
  though they don't cost the score anything).
- `src/app/(app)/projects/[id]/stages/[stageId]/page.tsx` — a new secondary
  "Run Financial Check" button in the header, next to "Stage Closeout".

## Deviations from the ticket's prose

- **Not a Server Action** — the ticket's prose calls "Run Financial Check" "a
  Server Action that runs the checks inside a `withAccount` transaction and
  renders the result." It is instead a plain Server Component page
  (`financial-check/page.tsx`) that calls `getStageReconciliationReport`
  directly on render. Functionally identical (fresh `withAccount` transaction
  every visit, nothing cached or stored) but architecturally simpler and
  consistent with every other "on demand" report in this codebase (the
  Material Stock page, the Stage Closeout checklist's read side) — none of
  which route a pure read through a Server Action / `useActionState`, which
  exists in this codebase specifically for *writes* that need pending/error
  state. A future caller that wants a "Run Financial Check" button that
  doesn't navigate (e.g. a modal) can still call the same DAL function from
  a Server Action; nothing about the DAL layer forecloses that.
- **Tally granularity is "one row per alert *family* / per check type," not
  "one row per the guideline's literal 17 items."** The guideline's own
  worked example (24 Passed, 2 Warnings, 0 Critical = 26 rows total) already
  isn't 17 either, confirming its own report is granular per finding-type
  occurrence rather than a fixed 17-row checklist — this implementation
  follows that same spirit: ~19 rows for a typical stage (13 alert-derived
  families + 5 new/residual checks — `ALERT_FAMILIES` covers 6 of the
  guideline's numbered checks (1/15 merged, 7, 9, 10, 11, 14) plus 7 of
  Operational Control's own extra ambient signals that aren't in the
  guideline's 17 at all but still get folded in per ticket 04 §4's literal
  instruction to fold in the *whole* Alerts output).
- **Checks 1 and 15 share one tally row.** Both guideline checks literally
  name the same `unallocated-deposit` signal in ticket 04's own resolution
  text ("Client deposits reconcile to funding requests" and "Unallocated
  client funds are identified" are the same finding read two ways) — giving
  each its own row would double-count one real signal into two tally
  entries, silently distorting the score. One row, labelled with both check
  numbers, avoids that.
- **`info`-severity alerts/findings count toward Passed, not their own
  bucket.** The guideline's score only recognises three buckets (Passed /
  Warnings / Critical Issues) with no fourth "Informational" tally slot —
  folding `info` into Passed for scoring, while still rendering the message
  in the Passed card, keeps the score meaningful (a Fee Invoice outstanding
  or an over-payment with a reason on file isn't a reconciliation problem)
  without hiding the detail an Engineer would still want to see.

## Interface for any future caller

- **`getStageReconciliationReport(stageId): Promise<ReconciliationReport |
  null>`** (`src/lib/data/reconciliation.ts`, barrel-exported from
  `@/lib/data`) — the one entry point. Returns `null` only if the stage
  itself doesn't resolve (wrong id / cross-account, same `notFound()`
  convention as every other detail page).
- **`ReconciliationReport` / `ReconciliationCheck` / `ReconciliationFinding`**
  (`src/lib/reconciliation.ts`) — safe to import from a client component if a
  future screen wants to render the same shape differently.
- **`reconciliationScore(passed, warnings, critical)`** — the formula in
  isolation, for a unit test or a different rendering, without needing a live
  database.

## Verify

```bash
cd web
npm run typecheck   # clean in WSL
npm run lint        # clean in WSL
```

No migration generated (confirmed via the isolated-Linux-drizzle-kit
procedure — see "Schema" above). `db:migrate` / `npm test` / `npm run build`
verified via CI run `34908958723` on PR #4 (green: migrations, `lint`,
`typecheck`, the isolation suite, and `build` all ✓).

## Report back

Commit `234d2c3` on `phase3-change-forecast-control`; PR #4
(`https://github.com/erickmalz/MHANDISI-MAKINI/pull/4`); CI run
`34908958723` green. No migration needed — confirmed by the isolated
drizzle-kit diff ("No schema changes, nothing to migrate"). Slice 3.5 is
done — **this closes Phase 3's build order: all 5 slices (3.1–3.5) are now
done, CI-green, and sitting on PR #4.**
