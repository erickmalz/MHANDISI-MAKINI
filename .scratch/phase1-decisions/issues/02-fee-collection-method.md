# Supervisor Fee Collection Method

Type: grilling
Status: resolved

## Question

Is the supervisor's fee **included in the funding request** (paid by the client as part of the project deposit, then split out of project funds — as the existing Available Float formula in §6.1 already assumes) or **invoiced separately** (paid directly to the supervisor outside the project's deposit flow)?

This determines how Deposits (§20) split into fee-portion vs project-portion, and whether a separate fee-invoicing/payment record type is needed alongside Deposits.

## Decision

1. **Collection method**: The supervisor's fee is entirely separate from client deposits. It is never part of the funding request's deposit flow, and no deposit is ever split into a "fee portion." Every deposit received is 100% project funds.
2. **Scope**: This is a fixed platform rule for all projects (current 3 and future) — not a per-project or per-client toggle.
3. **Cadence**: Fee is invoiced per stage, in step with that stage's funding request.
4. **Trigger point**: The fee invoice for a stage is raised when that stage's funding request is **issued** to the client — not gated on the client actually funding/depositing.
5. **Client-facing visibility**: The fee amount still appears as a line on the client-facing Funding Request document (for cost transparency), even though the client doesn't pay it through that request's deposit.
6. **Mid-stage fee increases**: If an Additional Funding Request (§44) raises the fee for a stage already invoiced (e.g. due to an approved variation or overrun), a follow-up fee invoice is issued for the increment — the original per-stage fee invoice isn't left to absorb it or roll into the next stage.

### Consequences for the spec (mechanical fallout, not separate decisions)

- §6.1 Available Float formula: remove the "Fee Portion Removed From Project Funds" line — it no longer applies, since deposits never contain fee money.
- §20 Client Deposits: the "Fee portion" / "Project-fund portion" split fields collapse into a single amount field — every deposit is project funds only.
- A new **Fee Invoice** record is needed (separate from Deposit), feeding §6.4's existing "fee invoiced / fee received / fee outstanding" tracking, with its own lifecycle (Issued → Paid) and payment fields mirroring Deposit's (method, reference, proof of payment).
