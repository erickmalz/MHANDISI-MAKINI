# Petty Cash Mechanics

Type: grilling
Status: resolved

## Question

While resolving "Material Estimate Model" (ticket 01), a new concept surfaced that the guidelines doc doesn't currently model: **Petty Cash**, a client-funded, per-project pool for unplanned/unforeseen site expenses. It's topped up from two sources — accumulated material cost savings, and an optional dedicated upfront client contribution — and it counts as part of the project's Available Float rather than a separate tracked balance.

This ticket resolves the operational mechanics: does a Funding Request need its own "petty cash" line item/type for the upfront contribution? How are drawdowns (unplanned expenses paid from petty cash) recorded — a new record type, or folded into an existing one (e.g. Site Diary, a generic "Other Approved Commitment")? Do petty cash drawdowns require receipts/approval like supplier payments? Can the balance go negative (spent ahead of being topped up)? Does it reconcile at Stage Closeout, Project Closeout, or continuously?

## Answer

1. **No dedicated Funding Request line for petty cash funding.** An upfront client contribution toward petty cash arrives as a normal Deposit (100% project funds, per ticket 02) — petty cash isn't tracked as a separate balance (ticket 01), so it doesn't need a separate money-in path. It's simply earmarked from the project's existing Available Float.

2. **Funding-source tagging on existing payment records.** Supplier Payments (§24) and Labour Payments (§28) each gain a `funding_source` field: **Client Deposit** or **Petty Cash**. A subcontractor deposit or supplier purchase paid from petty cash is still recorded as a normal Labour Payment / Supplier Payment — just tagged — so Subcontractor/Supplier statements (§25, §26) stay complete regardless of funding source.

3. **New "Petty Cash Expense" record for costs with no existing home.** A lightweight new record type — amount, date, reason, optional receipt photo, project/stage — covers ad hoc unplanned costs that don't fit any existing Purchase Order/Supplier Payment or Labour Agreement/Labour Payment (e.g. an emergency tool rental). This is the only genuinely new transaction table; funding-source tagging (decision 2) covers the rest.

4. **Eligibility rule: "unplanned" is the test.** Any work or purchase that wasn't part of the project's original approved material take-off or labour agreement is eligible for petty cash funding, whether recorded via a tagged Supplier/Labour Payment or a new Petty Cash Expense. Anything already itemized in the approved estimate always goes through its normal Purchase Order / Labour Agreement flow, funded from the client deposit — petty cash is never a substitute for underfunded planned work.

5. **Petty cash never covers a Variation.** A scope change big enough to need a formal Variation (§29) always goes through Variation approval and its own (Additional) Funding Request, regardless of size — never funded from petty cash. This keeps the Variation approval gate meaningful and prevents scope creep from being routed around it as "unplanned" spending.

6. **Balance can go negative; a dedicated alert covers it.** Petty cash is a soft earmark within Available Float, not a hard-capped sub-account — spending ahead of a saving materializing is allowed, since blocking it would defeat the point of covering urgent unplanned costs. A new Financial Alert (§33 family), "Petty cash balance negative / running low," fires so the supervisor notices and can top it up (e.g. via the next Deposit).

7. **Reconciliation is continuous, with a closeout checkpoint.** Every Petty Cash Expense and every petty-cash-tagged Supplier/Labour Payment updates the running petty cash balance immediately, so it's always current on demand. Stage Closeout (§35) and Project Closeout (§37) each gain a checklist item confirming the petty cash balance and any unresolved petty cash expenses, matching the pattern already used for Materials/Labour/Client Funds/Fee.

### Consequences for the spec (mechanical fallout)

- New **Petty Cash Expense** table: `amount, date, reason, receipt_url, project_id, stage_id (optional), created_at`.
- **Supplier Payments** (§24, §50 `supplier_payments`) and **Labour Payments** (§28, §50 `labour_payments`) each gain a `funding_source` field: `client_deposit` | `petty_cash`.
- **Financial Alerts** (§33) gains a new alert: petty cash negative/low balance.
- **Stage Closeout** (§35) and **Project Closeout** (§37) checklists each gain a "Petty cash reconciled" item.
- No change to the Available Float formula (§6.1) or the `deposits` table (§50) beyond what ticket 02 already specified — petty cash funding rides entirely on the existing Deposit flow.
