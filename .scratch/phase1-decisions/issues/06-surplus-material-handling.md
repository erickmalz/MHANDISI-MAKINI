# Surplus Material Handling

Type: grilling
Status: resolved
Blocked by: 01 (resolved)

## Question

At Stage Closeout, which of the options in §36 does the supervisor actually use for leftover materials — consumed, carried forward to the next stage, returned to supplier, transferred within the same project, or written off — and by what rule does the choice get made (e.g. does it depend on who owns the saving, per the Material Estimate Model decided in ticket 01)?

Materials must never move between different client projects without an explicit accounting adjustment (§36) — confirm this constraint holds, and record any rule for choosing between the allowed options.

## Decision

1. **Carried Forward is the real, effectively only mechanism used in practice.** Surplus material approved at a stage's closeout flows into the *next sequential stage* of the same project (matching §35's existing "Carry Forward Approved Surplus Materials" post-closeout action). "Transferred Within Same Project" is not a distinct pattern the supervisor actually uses — given only one stage is normally active at a time (§13), there's rarely a different already-open activity to transfer into sideways.
2. **Returned to Supplier rarely/never happens** in the supervisor's real practice — once material is delivered to site, it isn't sent back.
3. **Written Off does happen** — breakage, waste, theft. It's recorded as a physical loss only; no separate financial re-entry is needed, since the material's cost was already captured at the original purchase (Budget model, ticket 01, means the client already paid actual cost regardless of what happens to the material afterward).
4. **The cross-project constraint holds as written in §36**: material must never move between different client projects without an explicit accounting adjustment. Confirmed, unchanged.
5. **Carried-forward material is never specially netted against a future request as a one-off adjustment.** It doesn't need to be, because every Funding Request / Material Take-Off already works this way by default: check what's on site first, then request only the shortfall. Surplus carried forward is simply part of that on-site stock check, not an exception to it.
6. **New requirement: a formal on-site material inventory ledger.** For point 5 to actually work, the app needs to know, per project and per material type, how much stock is already on site before it calculates a new stage's requirement. This wasn't previously in the guidelines' Material Take-Off model (§16), which only carries fields scoped to a single stage's own line (Estimated/Revised/Purchased/Delivered/Remaining/Actual). The ledger is:
   - A running quantity per project, per material type (reusing the existing Material/Description/Unit fields from §16 — no new material taxonomy needed).
   - **Incremented** when Stage Closeout carries surplus forward (i.e. when the closeout's Materials checklist step "Surplus materials recorded" resolves to Carried Forward for a line).
   - **Decremented** as stock is drawn into a later stage's take-off, or as material is Written Off.
   - Project-scoped, not stage-scoped — it persists until consumed, regardless of which future stage eventually draws it down.

### Rationale

The supervisor's practice narrows §36's five formal options down to essentially two real ones (Carried Forward, Written Off), with the other three (Returned to Supplier, Transferred Within Same Project, and moving material between different client projects) confirmed as not happening or explicitly banned. The one genuine gap this session surfaced is mechanical, not a business-judgment call: without a formal on-site stock ledger, the app can't actually implement "orders only what's not available" — it would either have to trust the supervisor's memory or risk over-requesting material the client has already funded and still has sitting on site, which runs against the app's core purpose of precise financial control (§5).
