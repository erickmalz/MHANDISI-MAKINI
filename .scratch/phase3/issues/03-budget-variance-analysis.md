# Budget Variance Analysis

Type: grilling
Status: resolved

## Question

Guidelines §59 item 5. `CONTEXT.md` already defines Material Variance =
Approved Estimated Material Cost − Actual Material Cost (a settled term), and
Phase 1 decision 01 already settled that a saving is never paid to the client
or kept by the supervisor — it's credited to Petty Cash. What's still open is
the *mechanics*: what "Approved Estimate" freezes and when, at what
granularity Actual Material Cost is reconciled against it, how this combines
with the already-built labour variance into one Budget Variance Analysis
surface, and what "credited to Petty Cash" actually does to the data model
given `petty_cash_expenses` today only records money going *out*.

## Answer

### 1. The freeze point mirrors the Task labour lock exactly

`material_lines` already carries `qty_original` / `qty_revised` and
`est_unit_cost_original` / `est_unit_cost_revised` columns (added ahead of
need when the table was designed) — they're just unused today because
`tasks.ts`'s `updateTask` deletes-and-reinserts the whole take-off on every
edit and refuses to do even that once `stageBudgetLocked` (the stage's
Funding Request is issued/closed). This ticket activates those columns using
the **same trigger** Operational Control decision 3 already uses for
`tasks.labourOriginal`/`labourRevised`: once a stage's Funding Request is
issued or closed, a take-off line's `*_original` values are frozen — the
**Approved Estimate** — and any further change to quantity or unit cost on an
existing line writes to `*_revised` instead, never overwriting the original.
Before lock, editing stays exactly as it is today (delete-and-reinsert; there
is no client-facing number yet to protect).

### 2. Post-lock take-off lines gain real per-line identity

Delete-and-reinsert cannot survive lock (it would destroy the very
`*_original` values just frozen, and the DAL comment already flags "no stable
per-line identity across edits" as the blocker). So once locked:

- Editing an existing line's qty/cost is a true `UPDATE` by `id`, writing
  `*_revised` only.
- A line added after lock is a new row with `qty_original` /
  `est_unit_cost_original` left `NULL` and only the `*_revised` pair set —
  the material-line mirror of a Task's `labourOriginal` staying unset until
  first written.
- A line can't be *deleted* after lock (no delivery/payment history depends on
  a take-off line the way a Labour Payment blocks Task delete, but silently
  removing a client-facing estimate line is the same "silently overwrites an
  estimate that already went out" risk decision 3 was written to prevent).
  Dropping a line post-lock is recorded as `qty_revised = 0` instead —
  the line stays visible, its revised cost reads zero, same audit posture as
  Purchase Orders' append-only-with-reversal.

No migration is needed for the columns (already present); the migration this
ticket needs is dropping the current `NOT NULL`-shaped assumption in
`insertTakeOffLines`/`updateTask` in favour of the per-line branch above —
build-time work, not a decision.

### 3. Reconciliation granularity: stage-level, not line-by-line matching

A Purchase Order's lines are free-text `item`/`unit` pairs tied to a Purchase
Order (project/stage-scoped), not to a specific take-off line or Task — there
is no stable key to match "50 bags cement" on a take-off line to "50 bags
cement" on a PO line across possibly several orders and suppliers without
fragile string-matching. Rather than invent one, **Budget Variance Analysis
reconciles at the Stage level**, the same granularity `computeStageFinancials`
and "Remaining Stage Requirement" (`CONTEXT.md`) already use:

- **Total Estimated Material Cost (stage)** = Σ over every take-off line
  under every Task in the stage of `qty × est_unit_cost`, using the revised
  pair where a line has one, else the original pair.
- **Total Actual Material Cost (stage)** = the stage's existing
  `paidPurchases` figure from `computeStageFinancials` (2.2) — money actually
  paid to suppliers, already computed, nothing new to build.
- **Material Variance (stage) = Total Estimated − Total Actual.**

Per-task or per-line drill-down is a reporting nicety, not a financial figure
anything else depends on — left as an optional future UI enhancement, out of
this ticket's required scope.

### 4. One combined Budget Variance card on the existing Stage page

Material Variance (above) and the already-built Labour Variance
(`labourRevised ?? labourOriginal` vs. Labour Paid, summed across the stage's
Tasks) are presented together as a single **Budget Variance** card added to
the existing stage detail page (`/projects/[id]/stages/[stageId]`, which
already lists the stage's Tasks) — not a new route. It shows, per stage:
Estimated Material / Actual Material / Material Variance, Labour Agreement /
Labour Paid / Labour Variance, and a combined total. This follows the same
"add a card to an existing page" precedent as Operational Control slice 4
(Attachments on the PO detail page) rather than the "new dedicated route"
precedent used for Statements, because Budget Variance has no identity of its
own beyond the Stage it summarizes.

### 5. Petty Cash "credit" is a derived figure, not a new ledger event

`petty_cash_expenses` only ever needs to model money going *out* — it stays
that way. A positive Material Variance never needs a corresponding "credit"
row, because Petty Cash was never a separate tracked balance to begin with
(`CONTEXT.md`: "still counts as part of the project's Available Float — it is
not a separate tracked balance"). The float formula already only subtracts
*actual* `paidPurchases`/`openPurchaseCommitments`, never the take-off
estimate — so an underspend against the estimate was never removed from float
in the first place, and there is nothing to move. What Phase 1 decision 01
meant by "credited to Petty Cash" is satisfied by a **derived, informational
figure** — "Accumulated Material Variance" — shown alongside Petty Cash
Expenses (and on the Budget Variance card) as the headroom a positive variance
has created, computed live as Σ Material Variance across the project's stages,
never stored, never posted as an event. No schema change.

### Consequences for the spec

- `material_lines`' existing `*_revised` columns go into active use; no
  migration adds columns, but `insertTakeOffLines` / `updateTask` in
  `web/src/lib/data/tasks.ts` need the per-line branch in §2 (build-time).
- `computeStageFinancials` gains a `materialVariance` (and reuses the existing
  labour figures for `labourVariance`) in its return shape — additive, no
  existing field changes.
- No new tables. No change to `petty_cash_expenses`.
- **Interfaces with sibling tickets (resolved in parallel, verify at
  compile-time):** Ticket 05 (Stage Closeout) — its checklist items "Purchases
  reconciled" / "Surplus materials recorded" should point at this ticket's
  stage-level Material Variance figure rather than inventing their own
  calculation; closeout does **not** need to "freeze" variance as a separate
  step, since it's already a live-computed projection like every other
  `StageFinancials` figure. Ticket 06 (Material Stock ledger) is
  **orthogonal**: that ledger tracks physical carried-forward quantity
  (units), this ticket tracks estimate-vs-actual cost (money) — the two share
  the take-off's `item` field as their only common concept and neither reads
  the other's data.
