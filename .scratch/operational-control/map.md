# Operational Control — decision map

Resolves the remaining items of roadmap "Phase 2 — Operational Control"
(`construction-supervision-app-expanded-guidelines.md` §58) that weren't
already shipped by the multi-tenancy rebuild (Suppliers, delivery tracking,
PO status lifecycle are done — see `.scratch/phase2/status.md`).

Resolved via the `grilling` skill, one session, 2026-09-12. Like
`.scratch/multi-tenancy/map.md`, this map **plans, it does not build** — the
per-feature runbooks/slices under `.scratch/operational-control/` do that.

## Decisions

### 1. Document attachments

Narrow scope: attach **one proof file** (a supplier invoice/receipt PDF or
photo) to a single **Payment**, **Purchase Order**, or **Labour Payment**
record. Reuses the `accounts.logo` pattern — raw bytes in Postgres (`bytea`),
size- and MIME-capped — no new infra. The broader Site Diary / progress-photo
timeline **stays out of scope**, per ticket 01's existing ruling
(`.scratch/multi-tenancy/issues/01-what-an-account-owns.md`); this is a
narrower, different feature (one proof file per financial record, not a
photo log), not a reopening of that decision.

**Implementation scoping note (Slice 4)**: the `attachments` table + DAL
(`setAttachment`/`getAttachmentMeta`/`getAttachmentFile`) support all three
targets equally. The **UI this slice only wires the Purchase Order target** —
`PurchaseOrderDetail.tsx` is a large (~800-line), already-working client
component, and threading a per-row upload widget into its Payments list
would mean restructuring several `useActionState` forms inside it. Rather
than risk that file for this pass, the attachment card is a small,
self-contained addition at the *page* level. Payment / Labour Payment upload
widgets are a fast-follow — same DAL, just their own small card wherever
those records are shown. ≤5MB, PDF/PNG/JPEG (the ticket doesn't specify a
limit; a receipt scan is realistically bigger than the 1MB logo cap).

### 2. Stage templates

A per-Account register (starts empty, like Suppliers/Subcontractors) of
`Template → Stage → Task → typical Material Lines`. A template stores
**names and units only** — no quantities, no prices, no costs; those are
filled in per-project after applying one. Two ways to create a template:

- A blank form (define stages/tasks/material-line names/units from scratch).
- "Save as template" from an existing project — copies its stages' /
  tasks' / material lines' names and units into a new template, dropping
  every number. Not new UI beyond one button; reuses the blank-template
  write path.

At "Create Project," picking a template lets the Engineer **deselect**
stages/tasks they don't want before the project is created — a template
is a starting point, not a mandate. Editing a template **never** touches
projects already created from it (a project copies the template's names at
creation time; there is no live reference back).

### 3. Budget revisions

The lightweight model the schema already anticipated: one "revised" value
per Material Line (`qty_revised`, `est_unit_cost_revised` — both columns
already exist, unused) and per Task's labour agreement (`labour_revised` —
column exists, already read by the projection via
`COALESCE(labour_revised, labour_original, 0)`, but never written by any
form). **No audit trail** — a revision is a plain edit, not a numbered,
reasoned, approved chain (rejecting §17's heavier "Revision 1 / Revision 2 /
Approved / Actual" model for v1).

**New rule**: once a Stage's Funding Request is **issued** (or closed), its
Material Lines' and Tasks' revised values lock — a real post-Issue change
goes through **superseding the Funding Request** (already built, Slice 2.5)
instead, so there is exactly one place a client-facing number ever changes
after the fact, not two competing mechanisms.

**Implementation scoping note (Slice 2)**: Task labour got the full
treatment — `labourOriginal` is set once at creation and never touched
again; every edit thereafter writes `labourRevised` instead, and the edit
form shows "Original: {value}" once one exists. **Material Lines did not** —
they're delete-and-reinsert on every Task edit (2.4b), which has no stable
per-line identity to hang an original/revised pair off. Rather than half-build
that, Material Lines stay single-valued (`*Original` only, as before); the
lock still applies to the *whole set* once the stage's FR is issued (an edit
is refused outright, never silently written), so "never silently overwrite an
estimate already gone out to the client" holds even without per-line revision
tracking. Proper Material Line revisions are left for whenever Material
Variance reconciliation (already a flagged later slice) needs stable line
identity anyway. New Task creation is **not** locked — the decision covers
*revising* an existing figure, not adding new scope.

### 4. Alerts

`src/lib/data/alerts.ts` already computes 3 Financial alerts (negative
float, funding pending / underfunded, fee outstanding), shown on the project
page and the app home "Command Center." Extend it with everything now
computable from data that already exists:

- **Procurement**: material not ordered, PO overdue (past
  `expected_delivery_on`, still `ordered`), partial delivery outstanding,
  supplier invoice unpaid. "Missing receipt" / "missing delivery note" wait
  for decision 1 (Document attachments) to land — they need attachment
  presence to mean anything.
- **Labour**: labour payment exceeds the agreement, final payment requested
  on an incomplete task, stage complete with labour outstanding.
- **Financial** (beyond the existing 3): float below upcoming commitments,
  unallocated deposit.

**Deferred to Phase 3**: every Control Alert (variations, closeout,
reconciliation — none of those features exist yet) and "cost variance above
threshold" (needs decision 3's "revised" values to be a meaningful variance
signal — belongs with Phase 3's Budget Variance Analysis, not bolted on
early).

Delivery stays **dashboard-only** — a count + list, no email — matching
§7's "Number of unresolved alerts" framing on the project card.

### 5. Supplier / Subcontractor Statements

In-app, read-only screens — not a rendered PDF/JPG document. A Statement is
always a **live, current** view (every order/payment to date, across every
project the party is used on), which doesn't fit ticket 10's "frozen
snapshot at Issue" document model at all. Content per §Reports:

- **Supplier Statement**: Orders, Invoices (POs), Payments, Outstanding
  balance.
- **Subcontractor Statement**: Agreed labour, Payments, Outstanding
  balance. **Variations line omitted** — Variations don't exist until
  Phase 3.

PDF/JPG export is a deferred fast-follow (would reuse ticket 10's rendering
module once there's real demand for it), not part of this slice.

## Build order

No dependency runs Stage templates ↔ Budget revisions ↔ Alerts ↔ Statements
against each other except: **Alerts' two attachment-dependent items wait for
Document attachments.** Sequenced to land the no-new-schema work first (no
migration round-trip needed) and the two new-table slices last:

1. Alerts (Procurement/Labour/Financial items that don't need attachments)
2. Budget revisions (no new schema — the columns already exist)
3. Supplier / Subcontractor Statements (no new schema)
4. Document attachments (new `attachments` table — needs a migration)
5. Alerts follow-up: missing receipt / missing delivery note (now that
   attachments exist)
6. Stage templates (new `stage_templates` table — needs a migration)

Status tracked in `.scratch/operational-control/status.md`.
