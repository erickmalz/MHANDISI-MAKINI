# Fee Recognition Timing

Type: grilling
Status: resolved

## Question

Is the supervisor's fee **earned** (i.e. counted as "Fee Earned" in the Supervisor Fee Position, §6.4) when stage funding is received, progressively over the course of the stage, or only at stage completion?

This determines when "Fee Outstanding" starts being reported as non-zero and what the Stage Closeout fee check (§35) actually verifies.

## Decision

1. **Fee is earned when the Fee Invoice's status changes to Paid.** Not at invoice issuance, not progressively by stage `Progress percentage`, not deferred to Stage Closeout. This depends on Issue 02's resolution: the fee is billed via its own separate **Fee Invoice** record (Issued → Paid), independent of client deposits — so "earned" attaches to that invoice's Paid transition, not to a deposit event.
2. **Consequence: `Fee Earned` and `Fee Received` always move together.** Because both are triggered by the same event (the Fee Invoice being marked Paid), they are always numerically identical for a given stage. `Fee Earned` remains a distinct field for reporting/bookkeeping purposes (a labeled recognition milestone), even though it never diverges numerically from `Fee Received`.
3. **`Fee Outstanding` = Fee Invoiced − Fee Received** (a plain accounts-receivable figure), **not** `Fee Earned − Fee Received`. Since Earned and Received always move together, the latter formula would always compute to zero and couldn't produce the non-zero example the guidelines' own dashboard mockup shows (§7, "Fee Outstanding TZS 800,000"). `Fee Outstanding` becomes non-zero the moment a Fee Invoice is issued (§62.2 point 4: raised when the stage's Funding Request is issued) and stays non-zero until that invoice is marked Paid.
4. **Recognition granularity is a non-issue**: per Issue 02, a Fee Invoice's lifecycle is binary (Issued → Paid, no partial-payment states), so `Fee Earned`/`Fee Received` jump from 0 to the full invoice amount in one step at the Paid transition — there's no per-installment case to design for (unlike Deposits, which explicitly allow multiple partial payments against one Funding Request).
5. **The §35 Stage Closeout "Fee earned" checklist item is a reconciliation, not a recognition event** — it confirms `Fee Earned` correctly reflects which of the stage's Fee Invoice(s) have been marked Paid.
6. **Non-zero `Fee Outstanding` does not block Stage Closeout.** It raises a non-blocking alert only (parallel to the existing §33 Financial Alerts pattern), unlike labour outstanding (§33 "Stage complete with labour outstanding"), which is money owed *out* to a third party — fee outstanding is money owed *in* from the supervisor's own client, so there's no external-obligation risk in leaving a stage closed with fee still receivable.

### Rationale

The supervisor's own framing: the fee counts as earned specifically at the moment the client actually pays it (Fee Invoice → Paid), not merely when it's billed. This was checked against a pattern in the guidelines doc itself — every listing of the fee fields (§6.4, §10, §35) orders `Fee earned` before `Fee invoiced`/`Fee received`, suggesting the doc's authors may have originally pictured earned-before-billed accrual — but the supervisor's actual practice is the authority here (per this map's own ground rule), and the doc's field ordering doesn't itself encode a firm design decision. Confirmed explicitly, twice, in this grilling session.

The corollary this created — that `Fee Outstanding` can no longer be defined as `Earned − Received` without becoming a permanently-zero, useless field — was caught and resolved by redefining `Fee Outstanding` as the standard AR figure (`Invoiced − Received`), which is independent of the earned-timing decision and consistent with how `Materials Outstanding`/`Labour Outstanding` behave on the same dashboard (amounts billed/committed but not yet settled).

### History note

An earlier draft of this decision (during the same grilling session) assumed deposits still carried a fee portion, per the original §20/§6.1 text, before Issue 02's resolution (fee fully separated from deposits, billed via a standalone Fee Invoice) was cross-checked and found to contradict that assumption. The decision above supersedes that draft in full.
