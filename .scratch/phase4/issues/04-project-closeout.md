# Project Closeout

Type: grilling
Status: resolved

## Question

Guidelines §37 wants a full project-level reconciliation at final
completion (total client funding, total material commitments/actual cost,
total labour agreed/paid, total fees, approved variations, remaining client
float, supplier/subcontractor balances, outstanding documents, final
variance), a `projects.status` transition to `Completed` and later
optionally `Archived`. `.scratch/phase3/issues/07-phase3-scope-boundaries.md`
deliberately left this fully undesigned: "no schema, no ticket, no
forward-compatibility hook... a future Phase 4 map decides Project
Closeout's shape once it can see the actual Stage Closeout data shape
ticket 05 produces." Ticket 03 above just settled that shape (a frozen
snapshot document per closed Stage). Does Project Closeout follow the same
pattern?

## Answer

**Yes — same pattern as ticket 03, one level up.** Add `projects.status`
(`active | completed | archived`, default `active`). **Complete Project**
is gated on every one of the project's Stages already being `completed`
(mirroring Stage Closeout's own "hard-gate, not a suggestion" philosophy —
a project can't be marked done while a stage is still open). On Complete,
freeze a `project_closeout_report` snapshot — a fifth `DocumentInput` kind,
same rendering module as ticket 03 — assembled by **summing the already-
computed per-stage figures** (`finance.ts`'s existing per-stage/per-project
aggregation, plus each closed stage's own frozen Stage Closeout Report
figures where they exist) rather than a new project-wide financial
calculation engine. "Outstanding documents" in §37's list means any
unresolved Funding Request/PO/Variation at the time of Complete — since
Complete requires every stage `completed` and Stage Closeout's own four
gates already forbid an open Task/non-terminal Variation/`ordered` PO/open
Labour Commitment per stage, this line is almost always empty by
construction; it's included in the report for the rare cross-stage
straggler (e.g. an issued-but-undeposited Funding Request) that no
per-stage gate catches.

**Archived is a later, separate, reversible-looking action** — a plain
status flip with no further gate and no new snapshot (the Complete-time
report already captured the final numbers; Archived just changes how the
project is filtered/displayed, e.g. hidden from the default Choose Project
list). No "un-archive" flow is designed now — Archive is intentionally rare
and this ticket doesn't need to over-build it.

**No new Statement/report is triggered by Complete.** Supplier and
Subcontractor Statements (Operational Control decision 5) stay live,
current-state screens exactly as already built; a completed project's
Statement simply reads as "fully settled" if it is.

### Consequences for the spec

- New `projects.status` enum column + migration.
- New `completeProject` Server Action: validates every stage is
  `completed`, then assembles and freezes the snapshot in one transaction
  — same shape of change as `closeStage` gained in ticket 03.
- Fifth `DocumentInput` kind + HTML template, reusing `web/src/lib/documents/`.
- `archiveProject` is a second, much smaller action gated only on
  `status = 'completed'`.
- Depends on ticket 03 for the rendering-module extension pattern to
  already exist (build order: 03 before 04, or built together).
