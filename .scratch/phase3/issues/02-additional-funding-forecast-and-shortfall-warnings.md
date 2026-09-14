# Additional Funding Forecast & Funding-Shortfall Warnings

Type: grilling
Status: resolved

## Question

Guidelines §59 lists "Additional funding forecast" and "Funding-shortfall
warnings" as Phase 3 items. `CONTEXT.md` already precisely defines Forecast
Funding Requirement (FFR) and the Financial Health Indicator (Phase 1 ticket
08), and Operational Control Slice 1 already added an alerts engine. Is there
any genuinely new Phase 3 surface here, or is this guideline-doc line item
already satisfied by wiring Phase 1 + Operational Control already built —
and if there is a real gap, what exactly is it: a new calculation, a new
alert, or a new dashboard element?

## Answer

1. **Both guideline items are already fully built and shipped — this ticket
   closes with no new schema, calculation, alert, or screen.** Verified
   against the live code, not just the spec:
   - **"Additional funding forecast"**: `forecastFundingRequirement` (Phase 1,
     `web/src/lib/finance.ts:47`) is not just an internal number — it is
     already rendered as a labelled dashboard figure in
     `FinancialPosition.tsx` ("shortfall") and `Breakdown.tsx` (`ffr`) on
     every project page, and it already drives `HealthBadge`'s Red state
     (`financialHealth`, Phase 1 ticket 08) everywhere a stage is listed.
     There is no "second forecast" the guideline doc could mean beyond this.
   - **"Funding-shortfall warnings"**: `deriveProjectAlerts`
     (`web/src/lib/data/alerts.ts:64`) already raises
     `additional-funding-required` the moment FFR > 0 (and suppresses it
     while a Funding Request is already pending — `fundingRequestPending`
     takes priority, matching Blue's precedence in ticket 08). Operational
     Control Slice 1 separately added `float-below-upcoming-commitments`
     (`alerts.ts:85`) for the different case where FFR ≤ 0 (the stage is
     technically funded) but Available Float still doesn't cover what's
     already been ordered/agreed and unpaid. These two alerts are
     deliberately distinct, not duplicates: `additional-funding-required`
     answers "is the stage's scoped remaining requirement still short after
     float?" (the Red-state question); `float-below-upcoming-commitments`
     answers "can I actually pay what I've already signed for?" (a liquidity
     question FFR alone doesn't surface, since `remaining*` figures are
     floored at 0 and net against the Funding Request's own lines). No
     ticket needs to declare one authoritative over the other — they already
     coexist correctly, each keyed to its own alert id, each with its own
     message.

2. **A Variation (ticket 01) needs no new forecast/warning mechanism of its
   own.** Ticket 01 is expected to apply an Approved Variation's labour/
   material impact through the same task-revision fields Operational Control
   Slice 2 already built (`tasks.labour_revised`, treated as the live signed
   commitment). Once that write happens, `computeStageFinancials` already
   recomputes `openLabourCommitments`/`openPurchaseCommitments` from the live
   figures, which immediately moves Available Float and, downstream, FFR and
   both alerts above — with zero code awareness that a Variation caused the
   change. This is exactly consistent with Phase 1 ticket 07's existing rule
   that an approved-but-unrealized Variation must **not** pre-emptively move
   float — it only does so once it produces a real, signed commitment
   (here, a revised Labour Agreement figure or a Purchase Order), which is
   ticket 01's financial-application decision, not a new rule for this
   ticket to add. If ticket 01 instead decides a Variation's Approved state
   should NOT immediately touch `labour_revised`/material lines (deferring
   the actual commitment to a later explicit action), that decision governs
   the timing — this ticket's forecast/warning machinery reacts correctly
   either way, since it only ever reads the live committed figures.

3. **No UI or schema change is proposed.** No new dashboard card, no new
   alert id, no migration. The existing `FinancialPosition`/`Breakdown`
   figures and the two existing alerts are the complete, correct
   implementation of both guideline items as understood against this
   project's own already-settled vocabulary.

### Consequences for the spec (mechanical fallout)

- Guidelines §59 items 2 and 3 are marked **already delivered** (by Phase 1 +
  Operational Control Slice 1/2), not new Phase 3 build scope.
- No dependency risk on ticket 03 (Budget Variance Analysis) or 04
  (Reconciliation Engine): those surface *different* signals (estimate-vs-
  actual variance, and a point-in-time consistency check) and neither
  overlaps this ticket's forecast/shortfall concept.
- Ticket 01 (Variations) should reference this ticket's point 2 rather than
  invent its own float/forecast-interaction rule — it only needs to decide
  *whether and when* an Approved Variation writes to the live commitment
  fields; everything downstream is already handled.
