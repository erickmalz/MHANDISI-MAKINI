# Financial Reconciliation Engine ("Run Financial Check")

Type: grilling
Status: resolved

## Question

Guidelines §34 asks for a dedicated "Run Financial Check" that tests a project
for inconsistencies against 17 recommended checks, producing a Reconciliation
Score plus Passed/Warnings/Critical counts. Operational Control already built
a persistent Alerts feed (`deriveProjectAlerts` + `computeStageAlerts` in
`web/src/lib/data/alerts.ts`) covering several of those 17 checks. Resolve:
which of the 17 checks are new work vs already-covered vs structurally
impossible to violate; a Reconciliation Score formula that's actually
internally consistent (the guideline's own worked example — 24 Passed, 2
Warnings, 0 Critical → "96%" — doesn't match a plain Passed/Total ratio);
whether the engine is per-Stage or per-Project; where it lives and how it's
computed; and whether it replaces, duplicates, or complements the Alerts feed.

## Answer

### 1. The 17 checks, one by one

1. **Client deposits reconcile to funding requests** — already covered.
   `deposits.funding_request_id` is a `NOT NULL` FK, so a deposit orphaned
   from a Funding Request is structurally impossible; the over-collection
   case is the existing `unallocated-deposit` alert. The report re-surfaces
   that alert rather than recomputing it.
2. **Deposits have valid project allocation** — structurally guaranteed.
   `deposits → funding_requests → stages → projects`, all `NOT NULL`
   composite FKs plus RLS. No runtime check adds anything; not built.
3. **Fee portion is excluded from project float** — structurally guaranteed
   by `finance.ts`/`projection.ts`'s design (fee fields are never summed into
   Available Float). This is a code invariant, not project data that can go
   wrong per-Account — it belongs in a unit test (already implicitly covered
   by the existing vocabulary/projection tests), not a per-project runtime
   check. Not built here.
4. **Purchase commitments reconcile to purchase orders** — tautological:
   `openPurchaseCommitments` in `computeStageFinancials` *is*
   `ordered − paid` computed directly from `purchase_order_lines`/
   `payment_records`, and orphaned lines are FK-impossible. Not built.
5. **Paid purchases reconcile to supplier payments** — `paidPurchases` is
   likewise a direct sum, so the literal check is tautological. But a real,
   worth-building check hides underneath it: a Purchase Order whose
   `paid_total` exceeds `ordered_total` (permitted at write-time only with an
   `over_payment_reason`, guidelines §42.6). **New check**: list every such
   PO with its recorded reason, as a visibility item (severity: info — it was
   a conscious, reasoned decision, not a bug).
6. **Procurement does not exceed material requirements without explanation**
   — needs a per-material-item match between Material Take-Off quantities and
   Purchase Order line quantities. `material_lines` and
   `purchase_order_lines` are independently entered with no FK between them
   (2.4b), so today's `material-not-ordered` alert is deliberately coarse
   (stage has take-off lines but zero POs at all). **Blocked on ticket 03**
   (Budget Variance Analysis), which is deciding whether Phase 3 introduces
   any per-item linkage for Material Variance. If it doesn't, this check
   stays exactly as coarse as the existing alert — re-surfaced, not enhanced.
   If ticket 03 does introduce a stable per-item key, this check should be
   promoted to a per-item over-order comparison then, not now.
7. **Labour payments do not exceed approved labour** — already covered by
   the `labour-exceeds-agreement-{taskId}` critical alert.
8. **Completed tasks have no unexplained labour balances** — partially
   covered. The existing `stage-complete-labour-outstanding` alert is
   *stage*-level (fires on the stage's aggregate `openLabourCommitments` once
   `Stage.status === "Completed"`). The guideline's phrasing is per-*task*.
   **New check**: enumerate, per stage, every `Task` with `status =
   'completed'` whose `agreement − paid > 0`, naming each task — the
   Alerts feed keeps the cheap aggregate signal; the report gives the
   itemised breakdown an Engineer would actually need to act on it.
9. **Negative float is highlighted** — already covered: `float-negative`.
10. **Missing receipts are identified** — already covered:
    `po-missing-receipt-{id}`.
11. **Missing delivery notes are identified** — already covered:
    `po-missing-delivery-note-{id}`.
12. **Duplicate supplier invoices are flagged** — **descoped for v1**. There
    is no supplier-invoice record or invoice-number field anywhere in the
    schema (`alerts.ts`'s own comment: "there is no separate invoice record
    in v1") — nothing exists to compare for duplication. Adding an
    invoice-number field would be new data-model scope past this ticket's
    remit; flagged below as fog for a future ticket, not silently dropped.
13. **Duplicate payment references are flagged** — **new check, and it's
    real**: `payment_records.reference` is a free-text optional field
    (confirmed in `web/src/lib/data/schema/payment-records.ts`) that an
    Engineer types by hand (e.g. a bank transfer ID) — exactly the kind of
    field where a copy-paste double-entry is a realistic mistake. Flag any
    two non-voided `payment_records` rows in the same Account sharing the
    same non-null, non-empty `reference` value (account-wide, not just
    same-PO or same-stage — the same bank reference reused across two
    different POs is exactly the bug this check exists to catch). Severity:
    warning.
14. **Outstanding purchase orders are identified** — already covered by the
    existing `po-overdue-*` / `po-partial-delivery-*` / `po-unpaid-*` set.
15. **Unallocated client funds are identified** — already covered:
    `unallocated-deposit`.
16. **Variations without approval are identified** — **blocked on ticket 01**
    (Variation module), which owns the Variation status enum and exactly
    which status makes a Variation "count" financially. Recommended shape
    once ticket 01 lands: flag any Variation sitting in `Draft`/`Submitted`
    past a staleness window (the concern is an *undecided* Variation, not an
    "unapproved" one silently affecting money — the data model should make
    the latter structurally impossible, the same way an unissued Funding
    Request has no financial effect). Not built in this ticket; noted as a
    dependency for ticket 01 to hand back.
17. **Closed stages have no unresolved commitments** — **blocked on ticket
    05** (Stage Closeout), which should make this structurally impossible at
    the point of closing (closeout gates on exactly this). Once ticket 05
    lands, this check becomes a **defensive re-check**, not the primary gate:
    scan for any stage with `status = 'completed'` where
    `openPurchaseCommitments > 0 or openLabourCommitments > 0` — catches
    drift from an edge case (e.g. a payment voided after closeout) rather
    than doing closeout's job over again. Not built in this ticket.

**Tally**: 8 already covered by existing alerts (1, 7, 9, 10, 11, 14, 15, and
4/5's tautological half), 3 structurally guaranteed / not applicable (2, 3,
4), 1 descoped for missing data model (12), 3 new checks built now (5, 8, 13),
2 new checks deferred to their owning ticket (6 depends on ticket 03, 16 on
ticket 01, 17 on ticket 05).

### 2. Reconciliation Score formula

The guideline's own worked example (`Passed: 24, Warnings: 2, Critical
Issues: 0` → `Reconciliation Score: 96%`) looks broken against a plain
`Passed / Total` ratio (24/26 ≈ 92.3%), but it resolves cleanly under a
**severity-weighted** formula where a Warning counts as half-credit and a
Critical Issue as zero credit:

```text
Reconciliation Score = round(100 × (Passed + 0.5 × Warnings) / (Passed + Warnings + Critical Issues))
```

Check: `(24 + 0.5×2) / 26 = 25/26 = 96.15%` → rounds to **96%**, matching the
example exactly. This is the formula — not a guess at a "clean" replacement,
but the one the guideline's own example was already using. It has the right
shape for the tool's stated purpose (§34: "informational, not an accounting
certification") — a Critical Issue should cost more than a Warning, and this
does that without an arbitrary extra weighting constant to invent.

### 3. Scope, placement, and computation model

**Per-Stage as the primary unit**, matching every other financial view in the
app (`computeStageFinancials`, `computeStageAlerts`, the one-stage-at-a-time
UX) — the report lives as a "Run Financial Check" action on the Stage detail
page, next to the existing Alerts panel. The two account-wide checks (5's
over-payment list and 13's duplicate references) are still shown inside the
per-stage report, scoped to that stage's own POs — the "account-wide"
principle only applies when *matching* a duplicate reference (a duplicate can
be against a payment recorded on a different stage of the same project or a
different project entirely), so the underlying query for check 13 looks
account-wide but is only ever surfaced from a stage report as "this stage's
payment X shares its reference with payment Y (on {other stage/project})."

**Computed live, on demand, no stored result** — same precedent as
`computeStageFinancials`: this is a single small-Account tool, not a batch
job, and a stored Reconciliation Score would immediately go stale the moment
any underlying record changes. "Run Financial Check" is a Server Action that
runs the checks inside a `withAccount` transaction and renders the result;
nothing new persists.

### 4. Relationship to the Alerts feed

**Complements, does not replace.** Alerts stays the always-on ambient feed
(cheap, already built, keeps the Engineer informed passively on every page
load). "Run Financial Check" is an Engineer-triggered deep audit — the
natural moment to run it is before issuing a Funding Request or starting
Stage Closeout (ticket 05 should reference it, not re-implement it). Its
implementation **calls into the existing `deriveProjectAlerts` /
`computeStageAlerts` functions directly** and folds their output into the
Passed/Warnings/Critical tally (an existing alert that isn't firing counts as
Passed; one that is firing counts as its own severity), rather than
re-deriving the same logic a second way — this is both DRY and the thing that
keeps the two surfaces from ever disagreeing with each other. The report adds
only checks 5, 8, and 13 (plus 6/16/17 once their dependency tickets resolve)
on top of what Alerts already reports.

### Consequences for the spec

- No new tables. `payment_records.reference` (already a column) becomes the
  key for check 13 — no schema change.
- `deriveProjectAlerts`/`computeStageAlerts` gain no new parameters; the
  reconciliation report is a new function (e.g. `computeReconciliationReport`)
  that calls both and adds checks 5/8/13.
- Checks 6, 16, and 17 are explicitly **not built by this ticket** — they are
  handed to tickets 03, 01, and 05 respectively as a dependency each of those
  tickets should account for in its own consequences section.
- Check 12 (duplicate supplier invoices) is dropped from v1 for lack of a
  data field, not forgotten — recorded under "Not yet specified" below in
  case a future ticket adds an invoice-number field to Payment Records or
  Attachments.

## Coordinator notes (not part of the resolved ticket)

- **Dependency on ticket 01** (Variation module): check 16 needs ticket 01's
  final Variation status enum before it can be built; this ticket only
  specifies the recommended shape.
- **Dependency on ticket 05** (Stage Closeout): check 17 should become a
  defensive re-check once ticket 05 defines Stage Closeout's own gating —
  this ticket does not decide the closeout gate itself, ticket 05 does.
- **Dependency on ticket 03** (Budget Variance Analysis): check 6 stays
  exactly as coarse as today's `material-not-ordered` alert unless ticket 03
  introduces a stable per-item link between Material Take-Off lines and
  Purchase Order lines — if it does, check 6 should be revisited, not this
  ticket reopened.
- Suggested `map.md` "Decisions so far" bullet: "[Financial Reconciliation
  Engine](./issues/04-financial-reconciliation-engine.md): 'Run Financial
  Check' walks all 17 guideline checks — 8 already satisfied by the existing
  Alerts feed, 3 structurally impossible to violate, 1 descoped (no
  supplier-invoice data field exists), 3 new (over-payment visibility,
  per-task unexplained labour balance, duplicate payment references), and 3
  deferred to their owning ticket (material-vs-take-off matching to ticket
  03, unapproved-variation staleness to ticket 01, closed-stage commitment
  safety-net to ticket 05). Reconciliation Score is `round(100 × (Passed +
  0.5×Warnings) / (Passed + Warnings + Critical))` — this reproduces the
  guideline's own 96% example exactly. Per-Stage, computed live with no
  stored result, and implemented by calling the existing alert functions
  directly rather than re-deriving their logic — the report complements the
  persistent Alerts feed (which stays as-is) rather than replacing it."
- Nothing here conflicts with ticket 03 or 05 as far as I can tell from their
  ticket titles alone — the three explicit dependencies above are additive,
  not contradictory. Worth the coordinator double-checking ticket 05's
  closeout checklist doesn't independently re-invent a "Run Financial Check"
  button under a different name.
