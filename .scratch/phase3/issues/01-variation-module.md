# Variation module — workflow, numbering, and financial application

Type: grilling
Status: resolved

## Question

Guidelines §29 specifies a Variation module (fields, an 8-state status list,
and "approved variations should automatically update revised forecasts
without deleting original values") but leaves every mechanic open: which
states are real, how numbering works, exactly how an Approved Variation
writes into the financial model given the Task/Material-Line write paths
Operational Control already built (and locked, once a stage's Funding
Request is issued), how a Variation relates to an Additional Funding
Request, and how its "Fee impact" field interacts with the Phase 1 fee
model. Resolve each so the build has no state-machine or write-path
guesswork left, matching the discipline multi-tenancy ticket 09 applied to
Funding Requests and Purchase Orders.

## Answer

### 1. Status set: four stored states, not eight

Guidelines list `Draft / Submitted / Approved / Rejected / Funded / In
Progress / Completed / Cancelled`. Following the same collapse multi-tenancy
ticket 09 §2 applied to Purchase Orders (dropping "Confirmed" to a note), the
stored enum is **`variation_status = draft | approved | rejected |
cancelled`**:

- **`Submitted` is dropped.** There is no separate client login (guidelines
  §61) — the Engineer records the client's real-world decision directly.
  Moving a Draft to Approved (or Rejected) *is* the submission-and-decision
  event; there's no distinct "waiting" state worth persisting.
- **`Funded` is dropped as a stored state — it's derived**, the same way a
  Purchase Order's `partially_delivered`/`paid` sub-states are read off child
  records rather than written. "Is this Variation funded?" is answered by
  whether it's linked to an issued Additional/base Funding Request (§4
  below), computed at read time, never stored.
- **`In Progress` and `Completed` are dropped.** The physical work a
  Variation authorises is tracked on the Task(s) it touches — Tasks already
  have their own `status`/`progressPercent`. Duplicating that on the
  Variation would be a second, driftable source of truth for the same fact,
  which this codebase consistently avoids (no denormalised totals anywhere
  in the projection). A Variation's own lifecycle ends at `approved`.
- **`Cancelled`** stays, as the terminal off-ramp for a Draft or an Approved
  Variation whose scope change is abandoned before it's acted on further
  (mirrors PO `cancel`).

This gives Variations the same small cardinality as Purchase Orders
(4 stored states) rather than Funding Requests' 5 — appropriate, since a
Variation has no version chain and no deposit-progress sub-states to track.

### 2. Numbering: `VO-{project_code}-NNN`, minted at Approve

Extend `document_number_type` (`web/src/lib/data/schema/enums.ts`) with a
third value, `"variation"`, and `claimDocumentNumber`'s type union
(`web/src/lib/data/document-numbers.ts`) to match — the helper is already
written generically (`INSERT … ON CONFLICT (project_id, type)`), so this is
additive, not a rework. Following the Issue/Order idiom exactly: a Draft
Variation has no number; **Approve is the atomic transaction that mints
`base_number`/`display_number`** (no `v{n}` suffix — Variations don't
version) and is the line between editable and immutable. Rejected and
Cancelled Variations never get a number, same as a Purchase Order never
numbers a Draft that's abandoned before Ordering.

### 3. Financial application: Approve writes through the existing revision
paths, as the one sanctioned bypass of the stage lock

A Variation always names exactly one Stage and exactly one Task (matching
the guidelines' field list literally — "Project, Stage, Task" — Project is
derived through the Task's Stage, not stored redundantly, same denormalising
rule every other table in this schema follows). When the scope change
doesn't fit any existing Task (guidelines' own example, "Additional room"),
the Engineer creates the new Task first — already possible today with no
lock check at all (`createTask` in `web/src/lib/data/tasks.ts` never calls
`stageBudgetLocked`) — and then raises the Variation against it.

**Approving** a Variation is the one caller allowed to write past
`stageBudgetLocked` (`web/src/lib/data/tasks.ts`), because a Variation is
precisely the guidelines' sanctioned mechanism for changing a locked stage's
numbers — the same relationship a Funding Request's superseding version has
to its own frozen content. Concretely, in a new `web/src/lib/data/
variations.ts`, `approveVariation`:

- **Labour impact** → writes the Task's `labourRevised` field directly
  (`labourRevised = (labourRevised ?? labourOriginal ?? 0) + labourImpact`),
  bypassing `stageBudgetLocked` for this call only. A plain manual edit via
  `updateTask` stays blocked by the lock exactly as today — only the
  Variation-approval code path may move `labourRevised` once a stage is
  locked. This satisfies "without deleting original values" literally:
  `labourOriginal` is never touched.
- **Material impact** → **appends** new `material_lines` row(s) rather than
  running the existing delete-and-reinsert `updateTask` path. Material Lines
  have no per-line original/revised split yet (Operational Control decision
  2's scoping note — delete-and-reinsert has no stable per-line identity),
  so approving a Variation must never touch an existing line; it only adds
  new ones, tagged with a nullable `variation_id` column on `material_lines`
  so the take-off screen can show which lines came from which Variation.
  This sidesteps the missing-identity problem entirely rather than solving
  it, and is consistent with never deleting original values.
- **No `computeStageFinancials` change is needed.** The 2.2 projection
  already reads `tasks.labour_original`/`labour_revised` into
  `openLabourCommitments` (Operational Control's own Slice 2 note: "creating
  a task with a labour amount moves those figures — that is correct"). The
  instant Approve writes `labourRevised`, Available Float already reflects
  it — Phase 1 issue 07 decision 4's rule ("Approved-but-unrealized
  Variations do NOT reduce float pre-emptively... only once it produces a
  real commitment") is satisfied automatically, because at `approved` the
  labour figure *is* the real, revised agreement, not a speculative one.
  Material impact lines behave the same way once ticket 03 (Budget Variance
  Analysis / Material Variance) wires `material_lines` into the projection —
  no special-casing for Variation-sourced lines is needed there either.

### 4. Relationship to the Additional Funding Request: manual, not auto-drafted

Approving a Variation does **not** auto-create an Additional Funding
Request. `CONTEXT.md`'s AFR entry already settles the business fact
("raised... typically from Variations"); this ticket settles the mechanism:
raising the AFR stays a deliberate, separate action the Engineer takes
afterward — consistent with the project's "nothing is ever seeded or
auto-created" posture (`mhandisi-makini-every-account-starts-empty`). Add a
join table `additional_funding_request_variations (funding_request_id,
variation_id, account_id)` (composite-FK'd to both parents on `(id,
account_id)`, same honesty rule as every other cross-reference in this
schema) so an AFR can optionally record which Approved Variation(s) it's
collecting money for — purely informational/traceability, no computation
depends on it. This also answers "Funded" (§1): a Variation reads as funded
once every AFR/base-FR row joined to it (if any) is `issued` or later.

### 5. Fee impact: a carried note, not a new charge path

Phase 1 fixed the fee as fixed-per-stage, billed only through a Funding
Request/AFR's own Issue transaction (`.scratch/phase1-decisions/issues/
02-fee-collection-method.md`), and slice 2.5 already raises a fresh Fee
Invoice on **every** AFR issue (`funding.ts`'s "Fresh Fee Invoice for a first
issue or an additional request" path) — no new fee-invoicing code exists to
write. So a Variation's `fee_impact` field is **carried information only**:
what the Engineer expects the fee to grow by because of this scope change.
When they later raise the AFR referencing this Variation (§4), they enter
that same delta as the AFR's own fee line by hand, and the existing Issue
transaction invoices it exactly as it does today. No automatic linkage
between `variations.fee_impact` and a Fee Invoice amount — keeping the
already-built, already-CI-verified fee path untouched.

### 6. Approval semantics without a client login

`Requested date` is set at Draft creation (a plain `createdAt`-derived
field, not separately entered). `Approval date` and `Client reference` are
two plain fields the Engineer fills in the instant they mark a Variation
`approved` — a free-text reference (a WhatsApp confirmation, a signed
change-order sheet number) and a date, documenting the client's real-world
sign-off. Neither gates the Approve action; they're the record of it, the
same way Purchase Order's `supplierAckNote`/`supplierAckOn` are a dated note
rather than a lifecycle gate (ticket 09 §2).

### Consequences for the spec

- New table `variations`: `id`, `account_id`, `stage_id` + `task_id`
  (composite-FK'd `(id, account_id)` per this schema's honesty rule),
  `status` (`variation_status` enum, §1), `base_number`/`display_number`
  (nullable until Approve, §2), `description`, `reason`, `material_impact` /
  `labour_impact` / `fee_impact` (signed numeric — a scope change can reduce
  as well as add), `requested_at`, `approved_at`, `client_reference`,
  `notes`, `rejected_at`, `cancelled_at`.
- `document_number_type` gains `"variation"`; `claimDocumentNumber`'s type
  union extended to match (`web/src/lib/data/document-numbers.ts`).
- `material_lines` gains a nullable `variation_id` column (§3).
- New join table `additional_funding_request_variations` (§4).
- New `web/src/lib/data/variations.ts`: read (`listVariationsForStage`,
  `getVariation`) + write (`createVariation` draft CRUD, `approveVariation`
  — the one caller allowed past `stageBudgetLocked`, `rejectVariation`,
  `cancelVariation`). No `accountId` in any signature, same `withAccount` +
  RLS rule as every other DAL module.
- No `computeStageFinancials` change and no Fee Invoice code change — both
  existing mechanisms already do the right thing once Approve writes through
  them (§3, §5).
- UI: a Variation list/detail under the Stage (mirrors the Task list
  pattern), a "Raise Additional Funding Request" action from an Approved,
  not-yet-funded Variation that pre-links it via §4's join table.

**Dependencies noted for the coordinator**: ticket 03 (Budget Variance
Analysis) inherits the `material_lines.variation_id` tag and should decide
how Variation-sourced lines read in a variance report (they're not part of
the original estimate, so a naive "estimate vs actual" diff would wrongly
flag them as overspend — they should reconcile against `material_impact`
instead). Ticket 05 (Stage Closeout) should treat "Outstanding variations
resolved" as: no `draft`/`approved`-but-unfunded Variation is left open
against the stage (checklist wording, no schema needed from this ticket).
Ticket 02 (funding forecast) may want to surface unfunded Approved
Variations as a specific forecast/warning line, distinct from the general
Forecast Funding Requirement — that's ticket 02's call, not this one's.
