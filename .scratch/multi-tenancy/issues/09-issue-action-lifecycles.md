# The persisted lifecycle of the "issue" actions

Type: grilling
Status: claimed
Blocked by: 08
Assignee: erickmalz (session 01V8EEY2Pf5sbyFm52evjGx3)

## Question

Ticket 08 fixed the data model and the write-DAL boundary but explicitly left
"enumerating every mutation" to the build. Three mutations, however, carry
genuine state-machine decisions that should not be left for the build to guess,
because getting them wrong is expensive to unwind:

- **Funding Request "Issue to client"** — today a mock button. Funding Requests
  are "versioned" (CONTEXT.md). Does "Issue" snapshot a version, so a later
  change creates a new version — or is an Issued request editable until a Deposit
  lands? What states does it move through (Draft → Issued → (Partially)
  Deposited → Closed / Superseded)? What is immutable once Issued?

- **Purchase Order "Issue"** — CONTEXT.md already names the Commitment State
  lifecycle (Planned → Ordered → Partially Delivered → Delivered → Paid →
  Closed). Confirm "Issue" = the Planned → Ordered transition, what it locks
  (lines, supplier, totals), and whether a PO can be edited or only cancelled
  after Ordered.

- **"Record delivery / payment"** — these append child records (DeliveryRecord,
  PaymentRecord) to a PO. Decide the rules: can a delivery exceed the ordered
  qty; can payments exceed the ordered total; are these records editable or
  append-only-with-reversal; what re-derives the PO status (already
  `derivePOStatus`, promoted in ticket 08).

Also settle the meta-question the map fog raised: does this map specify these
lifecycles, or hand a one-line "the build decides" to the build effort?

Resolve by fixing each of the three state machines (or consciously handing them
to the build), plus the edit-vs-immutable rule after "Issue".
