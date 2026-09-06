# Material Estimate Model

Type: grilling
Status: resolved

## Question

Is the client's material estimate on a project a **budget** (the client pays actual material cost plus fee, so any saving between estimate and actual belongs to the client) or a **fixed-price procurement allowance** (the client pays the estimated amount regardless of actual cost, so any saving belongs to the supervisor)?

This determines ownership of Material Variance (guidelines §6.2, §17) and has a knock-on effect on how Surplus Material Handling (see the ticket blocked by this one) should work — if the answer here changes per-project rather than being a single fixed rule, that should be part of the answer too.

## Answer

**Model: Budget.** The client pays actual material cost plus fee; the client owns Material Variance, not the supervisor. Model this as a per-project setting (not a single global rule), defaulting to Budget, in case a future client negotiates a fixed-price arrangement instead — all 3 current real projects use Budget.

Variance is measured against the **Approved Estimate** (the latest client-agreed revision in the Budget Versions chain, §17), not the original estimate — a later approved revision supersedes the original as the real target.

A material cost saving is never paid to the client as cash and never kept as supervisor profit. It is credited to that project's **Petty Cash** balance — a client-funded pool for unplanned/unforeseen site expenses (a concept not previously in the guidelines doc; added to `CONTEXT.md`). Petty Cash is topped up from two sources: accumulated material savings, and (optionally) a dedicated upfront client contribution independent of any saving. Petty Cash still counts as part of the project's Available Float — it is not a separate tracked balance, just uncommitted client money earmarked for contingencies. An overspend (negative Material Variance) reduces Available Float exactly as already modeled; no change there.

Leftover *physical* material at Stage Closeout always stays on that project's site and is used on other activities within the same project — never sold back for client cash, never transferred to a different project. This directly informs, but does not fully resolve, the blocked ticket "Surplus Material Handling" (still needs its own session).

The operational mechanics of Petty Cash itself (funding-request line item, how drawdowns/expenses are recorded, receipts/approval, whether it can go negative, reconciliation point) are **not** resolved here — spun off as a new ticket, "Petty Cash Mechanics" (09).
