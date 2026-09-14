# Stage Closeout workflow

Type: grilling
Status: resolved

## Question

Guidelines §35 describes a "controlled closeout workflow" — six checklist groups
(Work, Materials, Labour, Client Funds, Supervisor Fee, Documents, ~16 line
items total) gating a `Close Stage` action, followed by four optional
next-actions. `CONTEXT.md`'s Stage Closeout entry already settles the *term*
("distinct from simply setting a Stage's status to Completed") but not the
mechanics. Resolve: which checklist items actually block `Close Stage` versus
are shown informationally; what `Close Stage` writes/locks in the data model;
which of the four post-closeout actions are real buttons; how the dormant
Retention line is shown; and confirm this is a stage-level action only.

## Answer

### 1. Hard-blocking vs informational — resolved per group

A single-user tool must not trap the Engineer on a technicality, so only
checks that would silently corrupt or orphan financial state are hard gates.
Everything else is shown as an informational summary the Engineer reads before
choosing to close.

**Hard-blocking** (`Close Stage` is disabled, with the failing item(s) named):

1. **No Task in the stage is still open** — every Task's status must be a
   terminal one (`completed` or `cancelled`); nothing left mid-work.
2. **No Variation on the stage is in a non-terminal status** (ticket 01) —
   `Draft`/`Submitted`/`Approved`/`Funded`/`In Progress` all block; only
   `Completed`, `Rejected`, `Cancelled` are closeout-safe. This is the
   mechanical form of §35's "Outstanding variations resolved."
3. **No Purchase Order on the stage is still `ordered`** — it must be `closed`
   or `cancelled` first. An open commitment left behind a closed stage would
   still count toward the *project's* Available Float (float is per-project,
   confirmed in `projection.ts`) but would have no live stage UI pointing at
   it — an orphaned commitment, not a closed one.
4. **Open Labour Commitments for the stage = 0** — every Task's labour
   agreement is either fully paid or was never set. This is one computed
   check, not two: it collapses §35's "Labour agreements reconciled,"
   "Labour payments reconciled," and "Outstanding balances resolved" into the
   single number `projection.ts` already computes per stage
   (`openLabourCommitments`), rather than three separate manual
   acknowledgements of the same fact.

**Informational-only** (displayed, never blocks):

- Materials: "Deliveries reconciled," "Remaining quantities reviewed,"
  "Surplus materials recorded" — over/under-delivery is explicitly a Material
  Variance *reconciled at* closeout per the guidelines' own Purchase Order
  definition, not a precondition *for* closeout. Surplus recording is ticket
  06's carry-forward action (see §5 below), offered, not forced.
- Client Funds: "Deposits reconciled," "Current float calculated," "Stage
  surplus/shortfall identified" — always-true display figures (the live
  per-project projection), not user-actionable gates. A negative outcome
  (Forecast Funding Requirement > 0 for the stage) is shown with emphasis but
  does not block — the Engineer may be mid-way through raising an Additional
  Funding Request already, and blocking here would just duplicate the
  existing Financial Health alert.
- Supervisor Fee: "Fee calculated / earned / received / outstanding" — Phase 1
  decision 03 already ruled non-zero Fee Outstanding a **non-blocking alert
  only** at closeout; this ticket just confirms Stage Closeout inherits that
  ruling rather than re-deciding it.
- Documents: "Relevant receipts attached," "Delivery notes attached" —
  Operational Control's attachment model is one optional slot per PO, not
  mandatory; "Funding-request record preserved" isn't a checklist action at
  all (an Issued Funding Request is already immutable by construction) and is
  dropped from the UI as a redundant line, shown instead as a one-line
  reassurance if shown at all.
- Retention: see §4.

### 2. What `Close Stage` writes

No new `stage_status` enum value is needed — `ready_for_closeout` and
`completed` already exist (`schema/stages.ts`), anticipating exactly this
ticket. `Close Stage` is available from `active` or `ready_for_closeout` (not
from `planned`, `awaiting_funding`, `on_hold`, or `cancelled`) and, in one
transaction, sets `status = 'completed'` and `completedOn = today`. It is the
hard-blocking checks in §1 that make this transition meaningfully different
from an Engineer manually picking "Completed" in the existing `StageForm`
select (which stays available for the informal case and does not run the
checklist) — `CONTEXT.md`'s "distinct from simply setting status to Completed"
phrase describes the *front door* (checklist-gated route vs. raw edit), not a
second status value.

**Freeze extension**: `tasks.ts`'s `stageBudgetLocked` currently locks a
stage's Task/Material-Line edits only once its Funding Request is
`issued`/`closed`. A stage can reach `completed` without ever having an
Issued Funding Request (e.g. a trivial stage) — that gap must not leave a
"completed" stage's budget still editable. `stageBudgetLocked` gains a second
OR condition: `stages.status = 'completed'`. No new column.

### 3. Post-closeout actions

- **Create Next Stage** — a real button, linking to the existing
  `projects/[id]/stages/new` route pre-filled with `seq = closedStage.seq + 1`.
- **Create Next Stage Funding Request** — a real button, shown only once a
  next stage exists (either just created, or already present), linking to the
  existing Funding Request create flow scoped to that stage.
- **Carry Forward Approved Surplus Materials** — a real button, but it is
  ticket 06's Material Stock "carry forward" action surfaced here, not new
  logic (see dependency flag in §5).
- **Carry Forward Approved Client Float** — **not a button; a no-op by
  design**, stated in the UI as a one-line note ("Available Float continues
  automatically into the next stage — nothing to carry forward"). Available
  Float is a live per-project computation (`projection.ts` sums across the
  whole project, not per stage), so there is no balance sitting inside the
  closed stage that needs moving. Inventing a transfer mechanism here would
  create a second, redundant source of truth for a number the app already
  gets right for free.

### 4. Retention line

Phase 1 decision 04 kept the retention fields/term in the data model
dormant-but-present rather than removing them, specifically so the Engineer's
mental model isn't surprised later if retention is ever turned on. The
closeout checklist follows the same reasoning: show an always-present,
non-interactive **"Retention: not used"** line under Labour rather than
omitting the row. It is never a checkbox and never blocks.

### 5. Dependencies on sibling tickets (flagged, not resolved here)

- **Ticket 06** (Material Stock ledger): "Surplus materials recorded" and the
  "Carry Forward Approved Surplus Materials" button both invoke ticket 06's
  carry-forward action directly — Stage Closeout owns no material-quantity
  logic of its own, only the button placement and the informational display
  of whatever ticket 06 reports as on-hand surplus for the stage.
- **Ticket 03** (Budget Variance Analysis): the Materials informational group
  ("Remaining quantities reviewed," implicitly the material cost picture)
  links to ticket 03's variance view as read-only evidence, rather than
  Stage Closeout computing its own variance figure.

Coordinator: please confirm tickets 03 and 06 agree they are the sole owners
of these two computations and that neither expects Stage Closeout to gate on
them.

### 6. Scope: stage only

`Close Stage` never triggers whole-project closeout. Guidelines §37 (Project
Closeout) is Phase 4 (§60 item 4) and out of scope for this map — ticket 07
confirms the same boundary from the other side. A project with every stage
`completed` simply has no active stage; nothing here proposes a "last stage"
special case.

### Consequences for the spec

- No new `stage_status` enum value; no new `stages` columns.
- `tasks.ts`'s `stageBudgetLocked` gains an OR on `stages.status = 'completed'`.
- The closeout checklist is a **computed view**, like `StageFinancials` — no
  new "checklist" table. It reads: Task statuses, Variation statuses (ticket
  01), Purchase Order statuses, `openLabourCommitments` (existing
  projection), Fee Invoice status (existing, non-blocking per Phase 1 #03),
  and ticket 06's Material Stock figures for the informational surplus line.
  Attachments checks read Slice 4's existing `attachments` table.
- One new Server Action (`closeStage`) enforcing the four hard gates in §1
  transactionally, plus three UI actions (Create Next Stage / Create Next
  Stage Funding Request / Carry Forward Surplus) and one static note (float).
- `CONTEXT.md`'s Stage Closeout entry needs no wording change — this ticket
  only fixed mechanics already implied by its definition.
