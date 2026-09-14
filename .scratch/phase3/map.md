# Phase 3 — Change & Forecast Control — Decision Map

Wayfinder decision map. Tracker: local markdown (`.scratch/phase3/`). Started 2026-09-14.

## Destination

Lock every product/business decision needed to build Phase 3 (guidelines §59,
"Change & Forecast Control") on top of the now-complete Phase 2 (domain
structure + persistence, PR #2) and Operational Control (PR #3) builds:
Variations, Additional Funding Forecast, Funding-shortfall warnings,
Funding-request versions, Budget Variance Analysis, the Project/Stage
Financial Reconciliation Engine, and Stage Closeout. Reaching the end means
every ticket below has a recorded answer, so the build can start without
guessing at mechanics the guidelines doc left open. **This map produces
decisions, not code** — same discipline as `.scratch/phase1-decisions/` and
`.scratch/multi-tenancy/`.

## Notes

- **Domain / prior spec**: `construction-supervision-app-expanded-guidelines.md`
  §29 (Variations), §34 (Financial Reconciliation Engine), §35 (Stage
  Closeout), §36 (Surplus Material Handling), §37 (Project Closeout, mostly
  out of scope — see ticket 07), §59 (Phase 3 item list); `CONTEXT.md`
  (glossary — Variation, Stage Closeout, Petty Cash, Surplus Material,
  Material Stock, Retention entries are all directly relevant and already
  settled at the definition level); the resolved `.scratch/phase1-decisions/`
  (esp. issues 06 Surplus Material, 07 Available Float formula, 04 Retention)
  and `.scratch/multi-tenancy/issues/09-issue-action-lifecycles.md` (the
  Issue/Draft/append-only conventions every new lifecycle here must match).
- **Build state this map is written against**: Phase 2 (`phase2-domain-structure`,
  merged) and Operational Control (PR #3, CI-green) are both fully built. In
  particular: Funding Request Issue/version/supersede + Additional Funding
  Request (slice 2.5), Purchase Order Issue/cancel/close/reopen (slice 2.6),
  document rendering (slice 2.7), account lifecycle (slice 2.8), the Alerts
  engine incl. float-below-upcoming-commitments (Operational Control slice 1),
  Task labour budget revisions (`labourOriginal`/`labourRevised`, Operational
  Control slice 2), Supplier/Subcontractor statements (slice 3), document
  attachments (slice 4), Stage templates (slice 6). Every ticket below is
  scoped against what already exists so it doesn't re-decide or re-build it.
- **Decision-maker**: the user answers every ticket personally, as the
  engineer who will use and run the product — resolved in this session by
  running the `grilling` design-tree method against the codebase/spec and
  **taking the firm recommendation on each frontier round as the decision**,
  per the user's explicit instruction and standing preference on this kind of
  ticket (see the memory `mhandisi-makini-grilling-accept-recommendations`).
  No round was left open for a second pass.
- **Every ticket is `grilling`** (paired with `domain-modeling` where a
  CONTEXT.md term needs sharpening) unless noted otherwise.
- **This map plans, it does not build.** The DDL, DAL, Server Actions and
  screens are a downstream build effort, tracked the way `phase2/status.md`
  and `operational-control/status.md` track their slices.

## Tickets

1. [Variation module — workflow, numbering, and financial application](./issues/01-variation-module.md)
2. [Additional Funding Forecast & funding-shortfall warnings](./issues/02-additional-funding-forecast-and-shortfall-warnings.md)
3. [Budget Variance Analysis (Material Variance + unified variance view)](./issues/03-budget-variance-analysis.md)
4. [Financial Reconciliation Engine ("Run Financial Check")](./issues/04-financial-reconciliation-engine.md)
5. [Stage Closeout workflow](./issues/05-stage-closeout-workflow.md)
6. [Surplus Material Handling + Material Stock ledger](./issues/06-surplus-material-and-material-stock-ledger.md)
7. [Phase 3 scope boundaries (funding-request versions already done; Project Closeout deferred)](./issues/07-phase3-scope-boundaries.md)

## Decisions so far

- [Variation module — workflow, numbering, financial application](./issues/01-variation-module.md):
  Stored status collapses to 4 (`draft/approved/rejected/cancelled`) —
  Submitted/Funded/In Progress/Completed all dropped (unneeded, derived, or
  duplicate Task-status tracking). Numbered `VO-{project_code}-NNN` via the
  existing `claimDocumentNumber` helper, minted at Approve. Approving a
  Variation is the one caller allowed to write past a locked stage's
  `stageBudgetLocked`: labour impact revises `tasks.labourRevised` in place,
  material impact only **appends** new `material_lines` (tagged
  `variation_id`), never touching existing rows — no `computeStageFinancials`
  change needed, the existing projection already picks both up. An Approved
  Variation never auto-drafts an Additional Funding Request (a new
  `additional_funding_request_variations` join table records the link when the
  Engineer raises one manually, reusing the existing Slice 2.5 AFR machine
  as-is — no new versioning behaviour); its `fee_impact` is a carried note the
  Engineer keys into the AFR's own fee line by hand. No client login, so
  `Approval date`/`Client reference` are the Engineer's own record of the
  client's real-world sign-off, not a workflow gate.
- [Additional Funding Forecast & Funding-shortfall warnings](./issues/02-additional-funding-forecast-and-shortfall-warnings.md):
  Both guideline items are **already fully delivered** — Phase 1's
  `forecastFundingRequirement`/`financialHealth` (on every project page) and
  Operational Control Slice 1's two distinct alerts
  (`additional-funding-required`, `float-below-upcoming-commitments`). No new
  schema, calculation, alert, or screen. A Variation (ticket 01) needs no
  bespoke forecast-interaction rule: once it writes through the existing
  `labourRevised`/material-commitment fields, the projection and both alerts
  already react correctly, consistent with Phase 1 ticket 07's "no pre-emptive
  float impact from an unrealized approval" rule.
- [Budget Variance Analysis](./issues/03-budget-variance-analysis.md):
  Reuses `material_lines`' already-present but unused
  `qty_revised`/`est_unit_cost_revised` columns, freezing `*_original` at the
  same stage-Funding-Request-issued/closed trigger Operational Control
  decision 2 already uses for Task labour, and switching post-lock take-off
  edits from delete-and-reinsert to true per-line updates (a dropped line
  reads `qty_revised = 0` rather than disappearing). Reconciliation is at the
  **Stage level** (Total Estimated vs. the existing `paidPurchases` figure),
  not per-line PO matching — there's no stable key to match free-text take-off
  lines to PO lines. Combines with the existing Labour Variance into one
  **Budget Variance** card added to the existing stage detail page (no new
  route). A Material Variance saving needs **no new Petty Cash ledger event**
  — Petty Cash was never a separately tracked balance, so an underspend
  already shows up as more Available Float automatically; "credited to Petty
  Cash" is satisfied by a derived, never-stored "Accumulated Material
  Variance" reporting figure.
- [Financial Reconciliation Engine ("Run Financial Check")](./issues/04-financial-reconciliation-engine.md):
  Walked all 17 guideline checks individually: 8 already satisfied by the
  existing Alerts feed, 3 structurally impossible to violate given the FK
  constraints and `finance.ts`'s design, 1 descoped for lack of a data field
  (duplicate supplier invoices — no invoice-number field exists anywhere), and
  3 genuinely new checks built now (over-payment visibility, per-task
  unexplained labour balance on completed tasks, duplicate payment
  references). The guideline's worked example (24 Passed/2 Warnings/0
  Critical → "96%") resolves exactly under a severity-weighted formula,
  `round(100 × (Passed + 0.5×Warnings)/(Passed+Warnings+Critical))`, adopted
  as the Reconciliation Score formula. Scoped **per-Stage**, computed live on
  demand with nothing stored, and **complements** rather than replaces the
  Alerts feed — implemented by calling the existing
  `deriveProjectAlerts`/`computeStageAlerts` directly and folding their output
  into the tally, so the two surfaces can never disagree.
- [Stage Closeout workflow](./issues/05-stage-closeout-workflow.md): Four
  hard-blocking gates only — no open Task, no non-terminal Variation, no
  `ordered` Purchase Order, and zero Open Labour Commitments on the stage —
  everything else (deliveries, surplus, deposits, fee outstanding,
  attachments) is informational, never blocking. `Close Stage` sets
  `stages.status = 'completed'` (no new enum value) and extends
  `tasks.ts`'s `stageBudgetLocked` with an OR on `status = 'completed'` so a
  stage with no issued Funding Request still freezes. Of the four guideline
  post-closeout actions, three are real buttons (Create Next Stage, Create
  Next Stage Funding Request, Carry Forward Surplus via ticket 06) and "Carry
  Forward Approved Client Float" is a **no-op note**, since Available Float is
  already a live per-project figure with nothing to transfer. Retention shown
  as an always-present, non-blocking "Retention: not used" line, consistent
  with Phase 1 decision 04. By construction, the four hard gates already
  satisfy guideline check 17 ("closed stages have no unresolved
  commitments") — ticket 04 needs no separate check for it. Confirmed
  stage-only — Project Closeout stays Phase 4.
- [Surplus Material Handling + Material Stock ledger](./issues/06-surplus-material-and-material-stock-ledger.md):
  New append-only `material_stock_movements` ledger
  (`carried_forward | drawn_into_takeoff | written_off`), balance derived by
  `SUM`, keyed on a normalised `lower(trim(item))+unit` text key rather than a
  real Material List register (confirmed never built). Stock increments only
  from Stage Closeout's Carried Forward step (ticket 05 calls a
  `carryForwardSurplus` write this ticket defines); Written Off decrements
  existing stock only when the loss is against already-carried-forward
  material, not a fresh surplus (a fresh-surplus Written Off touches nothing).
  Decrement on the consuming side is a manual, bounded "Apply from stock"
  input on the Material Take-Off line form (not automatic draw-down, since
  take-off lines have no stable per-line identity) — the take-off screen also
  gets an item `<datalist>` autocomplete as a cheap typo-drift mitigation.
  Returned to Supplier and Transferred Within Same Project get no schema/UI at
  all, closing off re-litigating Phase 1's rejection of them.
- [Phase 3 scope boundaries](./issues/07-phase3-scope-boundaries.md):
  Guidelines §59 item 4 ("Funding-request versions") is already fully
  satisfied by Slice 2.5's Draft→Issued→Superseded machine and Additional
  Funding Request path — no remaining Phase 3 work. Phase 3 is bounded to the
  six other tickets on this map. Out of scope, deferred to a future Phase 4
  map: Site Diary, Progress Photos, **Stage Closeout Reports** (a rendered
  report is Phase 4; the checklist/state-transition workflow itself is Phase
  3), Project Closeout (§37 — needs no schema or forward-compatibility hook
  now), Comprehensive Activity History, and the Advanced Reporting Dashboard —
  mirroring the precedent multi-tenancy's map.md already set for Site
  Diary/Progress Photos.

## Not yet specified

- **Ticket 04's two remaining deferred checks**: "procurement does not exceed
  material requirements without explanation" (guideline check 6) has no owner
  — ticket 03 (Budget Variance) computes stage-level cost variance but not an
  explicit over-order-vs-requirement explanation check; and "variations
  without approval are identified" (guideline check 16) has no owner —
  ticket 01 fixed the status set but didn't add a staleness/unapproved-age
  alert. Neither blocks the map (both are small, additive build-time
  refinements to the Reconciliation Engine ticket 04 already designed), but
  the build should either fold a simple version of each into ticket 04's
  checks or explicitly mark them descoped when it lands.
- **Material List register**: promised in multi-tenancy ticket 01 (a
  per-Account material/price book) but never built. Ticket 06 works around
  its absence with a normalised free-text key. Flagged as a clean future
  follow-up if item-name fragmentation (typos, inconsistent units) proves
  painful in practice — not a Phase 3 blocker.
- **Disambiguation for a future reader**: ticket 03 (Budget Variance) and
  ticket 06 (Material Stock) are orthogonal, not layered — 03 tracks
  estimate-vs-actual *cost*, 06 tracks physical carried-forward *quantity*.
  They share only the take-off's `item` field as a concept and never read each
  other's data.

## Out of scope

- **Site Diary, Progress Photos, Stage Closeout Reports, Project Closeout,
  Comprehensive Activity History, Advanced Reporting Dashboard** — guidelines
  Phase 4 (§60), a later map.
- **Reopening any Phase 1 financial decision, the multi-tenancy model, or any
  already-built Phase 2 / Operational Control slice's mechanics** — this map
  only decides genuinely new Phase 3 ground.
- **Column-by-column DDL, DAL signatures, Server Actions, and screens** — the
  build that follows this map, tracked in a new `.scratch/phase3/status.md`
  once the map is resolved (same split as Phase 2 / Operational Control).

## Status

**Complete.** All 7 tickets (01–07) are resolved, cross-checked against each
other's dependency flags (no contradictions found — see "Not yet specified"
for the two small additive refinements left to the build), and consistent
with every already-resolved Phase 1 / multi-tenancy decision and already-built
Phase 2 / Operational Control slice. The guidelines doc plus this map's seven
resolved issues together are the build-ready spec for Phase 3.
