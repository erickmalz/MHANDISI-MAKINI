# The persisted lifecycle of the "issue" actions

Type: grilling
Status: resolved
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

## Answer

### 0. The meta-question: this map fixes the state machines

What is immutable after "Issue", whether a change forks a version, whether a
record is append-only — these are **decisions, not build slices**. Getting one
wrong puts production financial records in the wrong shape, which is exactly the
"expensive to unwind" test that graduated this ticket out of the fog. So this
ticket fixes all three state machines and the numbering, document, and float
rules below. The build still owns: column-by-column Drizzle DDL, the mutation
endpoints, `derivePOStatus`'s new body, and every screen.

One principle runs through all three: **"Issue" is the line between editable and
immutable.** Before Issue a record is a Draft with no number and no financial
effect. Issue is a single atomic transaction that freezes the content, assigns
the permanent number, and starts the financial effect. After Issue the only
writes are appends (deposits, deliveries, payments) or a controlled
supersede / cancel — never an in-place edit of issued content.

### 1. Funding Request state machine

**States** (seven):

| State | Meaning | Stored or derived |
| --- | --- | --- |
| Draft | Being built, freely editable, no number yet | stored |
| Issued | Sent to client, content frozen, Fee Invoice raised, stage health Blue | stored |
| Partially Deposited | ≥1 Deposit received, Σ deposits < total requested | **derived** from Deposit records |
| Deposited | Σ deposits ≥ total requested | **derived** |
| Superseded | A later version replaced this one | stored |
| Cancelled | Withdrawn with no replacement (guidelines §41) | stored |
| Closed | Stage closeout reconciled this request; no further deposits expected | stored |

`Draft / Issued / Superseded / Cancelled / Closed` are the stored lifecycle bits;
deposit progress is computed per request from Deposit records (ticket 08 — no
denormalised totals). §19's "Funded" is renamed **Deposited** to match the
`CONTEXT.md` glossary (money in against a request is always a *Deposit*).

**Immutability and versioning.** A Draft is the only editable state. **Issue
freezes** the request number, all lines (material / labour / fee / other),
totals, and payment instructions permanently. A later change **forks a new
version**: `FR-{project}-004 v2` with `supersedes_request_id → v1`, its own
recorded reason; v1 moves to **Superseded**. v2 renders its own frozen content;
v1 still renders v1. Supersede is permitted any time before **Closed**.

- **Deposits recorded against v1 carry forward** and count toward the stage and
  toward v2's deposit progress.
- **v1 Fee Invoice, unpaid** → superseded alongside v1; v2 raises a fresh Fee
  Invoice.
- **v1 Fee Invoice, paid** → never touched (fee is earned once paid — Phase 1
  Fee Recognition Timing). If v2's fee is higher, v2 raises a **follow-up Fee
  Invoice for the delta only**; if lower, no clawback.

The asymmetry with Purchase Orders below (POs cancel-and-reissue, they do not
version) is recorded in
[ADR 0003](../../../docs/adr/0003-two-amendment-models-for-issued-documents.md).

**Additional Funding Request ≠ version.** A mid-stage scope increase (approved
Variations) is a **separate new Funding Request** — its own next base number, its
own Draft→Issued lifecycle, linked to the stage and optionally to the
justifying Variations. Both requests stay live; the stage's funding requirement
is their sum. Superseding is for *correcting* a request; an Additional Funding
Request is for *additive* growth. They are never the same mechanism.

**The Issue transaction** (atomic, and nothing more):
FR.status → Issued; lines / fee / payment-instructions snapshot immutable;
display number assigned; a **Fee Invoice created with status Issued** for the fee
line; `fundingRequestPending` and Blue stage-health become derivable from this
state (ticket 08). No deposit, no outbound notification — the engineer sends the
document by hand in v1.

### 2. Purchase Order state machine

**`CONTEXT.md`'s Commitment State is the canonical vocabulary:**
**Planned → Ordered → Partially Delivered → Delivered → Partially Paid → Paid →
Closed**, plus **Cancelled**. `Partially Delivered` / `Partially Paid` are
**derived** sub-states (they cost nothing to compute from the child records).

- **"Issue purchase order" = the Planned → Ordered transition.** (The mock's
  "Draft/Issued" names are dropped in favour of Planned/Ordered.)
- **"Confirmed" is dropped as a lifecycle state.** A supplier acknowledgement is
  recorded as an optional dated note on the PO, not a gate — deliveries can be
  recorded directly against an Ordered PO. `derivePOStatus` loses its
  `confirmed` branch (build detail).

**What Issue locks.** Planned: supplier, lines, quantities, unit prices, payment
terms all freely editable. **Issue freezes all of them** and assigns the PO
number; the ordered total begins counting against Available Float. After Ordered
the only writes are *appending* Delivery and Payment records, or **Cancel**.

**No in-place amendment, no version chain.** A genuine change to an Ordered PO is
**Cancel + issue a replacement PO** (or, where the scope change is client-facing,
a Variation that produces a new PO). Unlike Funding Requests, POs are cheap to
reissue and there is no client-held document to reconcile, so they do not get a
supersede/version mechanism.

**Cancel / Close / Reopen.**

- **Cancel** — allowed only while there are **no non-voided** deliveries or
  payments. A Cancelled PO carries zero commitment and zero paid value.
- **Close** — manual terminal action, allowed when the PO is fully delivered
  *and* fully paid (or already Cancelled). No deliveries / payments after Close.
- **Reopen** — available until the PO's **stage** is closed out; after Stage
  Closeout the PO is frozen with the stage (guidelines §42.14).

**The Issue transaction** (atomic): PO.status → Ordered; supplier / lines /
unit-prices / quantities / payment-terms snapshot immutable; PO number assigned;
the ordered total begins counting as an Open Purchase Commitment. No outbound
notification.

### 3. Delivery and Payment records

**Append-only with reversal.** A saved Delivery or Payment record is **never
edited**. A correction is **void the original** (`voided_at` + `void_reason` —
guidelines §41 "Void") **then enter a fresh correct record**. Every derivation
(`paidTotal`, delivered / accepted quantities, `derivePOStatus`, the float
figures) ignores voided records. No negative-quantity deliveries, no
negative-amount payments. A PO whose deliveries and payments are *all* voided
returns to cancellable.

**Over-limits.**

- **Delivery exceeding ordered quantity** — allowed, with a **required
  acknowledgement reason** stored on the Delivery record (guidelines §42.12).
  Over/under delivery is real; it surfaces as a line-level **Material Variance**,
  reconciled at Close / Stage Closeout. It does **not** change the PO's
  commitment figure.
- **Payment exceeding the outstanding / ordered total** — **soft-block**: warn,
  require a typed reason to proceed (guidelines §42.6 pattern). `paid > ordered`
  floors the commitment at 0 and shows as negative Outstanding (a supplier
  credit).

**PO status is always derived.** `derivePOStatus` stays the single source,
computed per request from lines + non-voided deliveries + non-voided payments +
the stored `cancelled` / `closed` bits. Nothing writes status directly (ticket
08).

### 4. A PO's exposure to Available Float tracks the order, not deliveries

Ticket 08 computes `openPurchaseCommitments` / `paidPurchases` from PO records.
The rule:

- **PO open (not Closed / Cancelled):** Open Purchase Commitment =
  `ordered total − paid total`, floored at 0, **regardless of delivered
  quantity**.
- **PO Closed:** contributes its **paid total** to `paidPurchases` and **zero**
  to `openPurchaseCommitments`; any undelivered remainder simply drops off.
- **Cancelled:** zero to both.

Under/over-delivery never moves the commitment — it is a **Material Variance**
reporting figure, reconciled at closeout.

### 5. Display numbering

Separate from the opaque URL id (ticket 06 owns that). The human-facing number:

- **Scope:** per-project sequential — `FR-{project}-001`, `PO-{project}-001`.
  Not per-account, not per-stage.
- **Assigned at Issue**, never at Draft — a Draft displays as "Draft" with no
  number. Once assigned, immutable, never reused (guidelines §41.19).
- **Versions share the base number** with a suffix: `FR-{project}-004 v1`, `v2`.
  An Additional Funding Request takes the **next base number**, not a suffix.

### 6. Shareable documents (added while resolving this ticket)

Each record the Engineer issues **outward** renders to a shareable document:
**Funding Request** (client-facing), **Fee Invoice** (client-facing),
**Purchase Order** (supplier-facing). Deposits, deliveries and payments get no
generated document — the Engineer is logging the counterparty's own paperwork.

- **Only an Issued record has a document**, and it renders the **exact frozen
  snapshot / version** (a superseded FR v1 still renders v1's content). Document
  identity = version identity.
- **One template per document type → PDF (authoritative) + JPG** (same content
  as a single image, for WhatsApp-style sharing where a PDF attachment does not
  preview inline).
- **Rendered on demand, never stored.** The snapshot is immutable so the render
  is reproducible; this keeps ticket 01's "no binary storage in v1" line intact
  and adds nothing to the ticket 03 data-protection surface.
- **v1 sharing is download-only** — the Engineer downloads the file and shares it
  themselves. A tokenised public link (client opens a URL with no login) is a
  later, separate decision because of the unauthenticated-access surface.

The **rendering mechanism** — library, where it runs in the Node container,
template system, TZS / date formatting, PDF→JPG conversion, per-document page
layout — is graduated to a new sibling ticket
([Document rendering approach for issued Funding Requests, Fee Invoices and
Purchase Orders](./10-document-rendering-approach.md)).

### 7. Scope line

**This ticket fixes:** the three state machines (states, which are stored vs
derived, what Issue freezes, supersede / cancel / close / reopen rules), the
append-only-with-reversal rule for child records, the over-limit rules, the
float-exposure basis for an open PO, the per-project numbering scheme, and the
shareable-document rules in §6.

**Handed to the build:** the Drizzle DDL for the lifecycle columns
(`status` enums, `voided_at`, `void_reason`, `supersedes_request_id`, number
sequences), `derivePOStatus`'s new body (drop `confirmed`), the mutation
endpoints, and every create / edit / issue / record screen.

**Graduated to a new ticket:** the document rendering approach (ticket 10).

