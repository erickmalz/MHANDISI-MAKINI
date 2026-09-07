---
status: accepted
---

# Funding Requests version-and-supersede; Purchase Orders cancel-and-reissue

## Context and decision

Both a Funding Request and a Purchase Order become **immutable when Issued** — an
Issued record's number, lines, and totals are frozen (see
`.scratch/multi-tenancy/map.md`, the "issue-action lifecycles" ticket). The
question this ADR records is what happens when an *Issued* one has to change.
The two records take **deliberately different paths**:

- **Funding Request → version-and-supersede.** A change creates a new version of
  the same request (`FR-{project}-004 v2`), with `supersedes_request_id`
  pointing at v1 and a recorded reason. v1 moves to `Superseded` but stays
  readable and still renders its own frozen content; deposits already received
  against v1 carry forward to the stage. The base number is stable across
  versions.
- **Purchase Order → cancel-and-reissue.** There is no PO version chain. A change
  to an Ordered PO is `Cancel` (allowed only while it has no non-voided
  deliveries or payments) followed by a **brand-new** PO with its own number, or,
  where the change is client-facing scope, a Variation that produces a new PO.

A third, separate mechanism sits alongside the Funding Request one: an
**Additional Funding Request** is a *new* request for additive scope growth, not
a version — both stay live and the stage's requirement is their sum.

## Why (the trade-off)

The consistent-looking choice would be one amendment model for both. We split
them because the two documents differ in the one way that matters here:

- **A Funding Request is a client-held document that must reconcile over time.**
  The client keeps the PDF, deposits against it in instalments, and the stage's
  funding position is measured against it for the life of the stage. Throwing it
  away and issuing an unrelated new one would break the audit trail between
  "what we asked for", "what they've paid", and "what changed". Guidelines §19
  and §42.8 are explicit: never overwrite an issued request; preserve the
  original; create a new version with a reason. The version chain is the
  feature.
- **A Purchase Order is a supplier instruction with a short useful life.** Once
  it is delivered and paid it is done; there is no months-long reconciliation
  against it and no instalment structure. A supplier who received the wrong PO
  is told "cancel that one, here's the correct PO" — which is exactly
  cancel-and-reissue. Building a version chain for POs would add schema and UI
  for a lifecycle event that, in practice, is a cancellation. Guidelines §41
  lists "cancel" as the PO remedy and "supersede" as the funding-request one.

## Consequences

- **`supersedes_request_id` and a shared base-number scheme exist for Funding
  Requests only.** Purchase Order numbers are always independent; a replacement
  PO has no structural link to the cancelled one beyond a free-text note.
- **"Amend this PO" is not a feature.** A future contributor who reaches for an
  edit-issued-PO flow should cancel-and-reissue instead; this ADR is why.
- **Reporting must sum across live Funding Requests** (original plus any
  Additional Funding Requests) and must **exclude Superseded versions** to avoid
  double-counting.
- **A Cancelled PO with voided-only history is fully cancellable**, so the
  cancel-and-reissue path stays open even after a mistaken delivery or payment
  is voided.
- If Purchase Orders ever grow a genuine long-lived reconciliation need (e.g.
  running supplier accounts across many partial deliveries and retentions), this
  split reopens.
