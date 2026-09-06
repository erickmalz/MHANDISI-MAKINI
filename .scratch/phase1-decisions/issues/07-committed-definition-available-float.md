# "Committed" Definition & Available Float Formula Completeness

Type: grilling
Status: resolved

## Question

The guidelines use "Committed" two ways: the Available Float formula (§6.1) names "Open Purchase Commitments" and "Paid Purchases" as separate, explicit line items, while the Supervisor Command Center dashboard (§7) shows a single aggregate "Committed" figure whose composition isn't defined.

Precisely define what "Total Committed" means for dashboard display (does it sum Open Purchase Commitments + Paid Purchases + Labour Payments + Fee, or a narrower set?), and confirm whether the §6.1 Available Float formula is complete as written or needs another line item netted out (e.g. approved-but-unfunded variations).

## Answer

1. **Fact check, not a decision: the doc's own worked example already defines "Total Committed."** §7's dashboard mockup (Deposited 28,000,000 − Committed 21,400,000 = Available Float 6,600,000) is arithmetically exact. So **Total Committed = Client Deposits − Available Float**, i.e. the sum of every line item subtracted in the corrected §6.1 formula below. No separate rule is needed for the dashboard figure — it falls out of the float formula automatically.

2. **A signed Labour Agreement reduces Available Float immediately, not only once paid.** The original formula only subtracted "Labour Payments" (cash actually paid), leaving a signed-but-unpaid labour exposure untouched — the same gap the "Open Purchase Commitments" line exists to close for materials. The formula gains an **Open Labour Commitments** line, defined as the existing Outstanding Labour figure (§6.3: Revised Labour Agreement − Labour Paid − Retention Released Adjustments), so it needs no new calculation, just wiring into Available Float.

3. **A Petty Cash Expense (ticket 09) needs its own explicit line.** It's real project money leaving the project with no matching line in the original formula — omitting it would overstate float. It is always already-spent by the time it's recorded (no "open"/unpaid state to model, unlike Purchase Orders or Labour Agreements).

4. **Approved-but-unrealized Variations do NOT reduce Available Float pre-emptively.** A Variation being Approved (§29) is a scope decision, not yet a priced procurement/labour commitment — its materials/labour/fee split can still shift once actually ordered. It only affects float once it produces a real Purchase Order, Labour Agreement, or Petty Cash Expense, at which point it flows through the lines above with no separate "Variation" line needed. The existing Forecast Funding Requirement (§9) already surfaces known future variation cost without touching *current* float.

5. **Corrected §6.1 Available Float formula:**

   ```text
   Available Float
   =
   Client Deposits
   − Open Purchase Commitments
   − Paid Purchases
   − Open Labour Commitments   (= Outstanding Labour, §6.3)
   − Labour Payments
   − Petty Cash Expenses
   − Other Approved Project Commitments
   ```

   (The formula's original "Fee Portion Removed From Project Funds" line stays removed, per ticket 02 — fee no longer touches Client Position at all.)

6. **Total Committed (§7 dashboard) = sum of every subtracted line above except Client Deposits**, i.e.:

   ```text
   Total Committed
   =
   Open Purchase Commitments
   + Paid Purchases
   + Open Labour Commitments
   + Labour Payments
   + Petty Cash Expenses
   + Other Approved Project Commitments
   ```

### Consequences for the spec (mechanical fallout)

- §6.1's formula and worked example updated as above.
- §6.3 Outstanding Labour is now wired directly into Available Float (previously only a standalone reporting figure).
- §7 Supervisor Command Center's "Committed" figure gets a precise definition (decision 6), resolving the ambiguity flagged in `CONTEXT.md`.
- No new tables required — Open Labour Commitments and Total Committed are both derived/calculated values (§51 Derived Financial Views), not stored fields.
