# Surplus Material Handling — the Material Stock ledger

Type: grilling
Status: resolved
Depends on: 05 (Stage Closeout supplies the `carryForwardSurplus` trigger this ledger consumes)

## Question

Phase 1 ticket 06 already resolved the *business* rule for surplus material
(only Carried Forward and Written Off happen in practice; Returned to
Supplier and Transferred Within Same Project don't; cross-project transfer
stays banned) and named the mechanical gap it can't close on its own: a
formal per-project, per-material-type on-site stock ledger, so a later
Material Take-Off can request only the shortfall instead of trusting memory.
That ledger was never designed or built. This ticket designs it: table
shape, how a "material item" is matched consistently across a take-off line,
a PO line, and a stock row, exactly when quantity moves in and out, and what
the take-off screen shows.

## Answer

1. **Table shape: an append-only movement ledger, not an upserted balance
   row.** `material_stock_movements` — one row per event
   (`account_id`, `project_id`, `item_key`, `unit`, `qty` signed, `reason`
   enum `carried_forward | drawn_into_takeoff | written_off`, optional
   `source_stage_id` / `task_id` for provenance, `created_at`). The
   on-hand balance for an item is `SUM(qty)` filtered by
   `(account_id, project_id, item_key, unit)`. This deliberately does **not**
   reuse `material_lines`' delete-and-reinsert shortcut: a take-off line is a
   disposable per-edit estimate scoped to one task with no history worth
   keeping, but Stock is a running balance that must survive independently
   of any single stage's take-off edits and is exactly the kind of
   money-adjacent exposure (it gates whether a Purchase Order gets raised)
   this project already treats as append-only-with-provenance rather than
   mutate-in-place (Purchase Order deliveries/payments, Delivery/Payment
   void records). A derived `SUM` read is trivial at this project's real
   volume (a handful of projects, a handful of material types each) and
   gives the Reconciliation Engine (ticket 04) and Stage Closeout (ticket
   05) a genuine audit trail — "where did this 40 bags of cement come
   from" — for free, instead of only a final number.

2. **Item identity: match on a normalised text key, not a new register —
   the Material List register named in multi-tenancy ticket 01 was never
   built.** A grep of the codebase confirms `material_lines.item` is still
   free text with no backing table; Stage Templates (Operational Control
   slice 6) shipped, the Material List price book did not. Building that
   full register now would pull an unrelated, already-decided-but-shelved
   Phase-2-scope item into this ticket. Instead: `item_key` is
   `lower(trim(item))` combined with `unit` (also lowercased/trimmed) —
   cheap, no dependency, and correct for the overwhelming common case of
   the same engineer typing the same handful of material names on one
   project. The known failure mode is typo drift ("Cement 50kg" vs "cement
   50 kg bag") silently fragmenting the balance into two stock rows instead
   of one — accepted as a real but minor risk for v1, mitigated by (4)'s
   autocomplete, not eliminated by it.

3. **Increment: only from Stage Closeout's Carried Forward step.** Ticket
   05 defines a write, `carryForwardSurplus(tx, stageId, lines: {item,
   unit, qty}[])`, called once when closeout's Materials checklist item
   resolves a line to Carried Forward; this ticket's ledger records one
   `carried_forward` movement per line. No other code path increments
   stock — there is no standalone "add stock" screen, since stock only
   ever originates as recorded surplus, never as a fresh manual entry.

4. **Decrement: a manual, explicit "apply from stock" step on the Material
   Take-Off line form — never an automatic draw-down tied to editing a
   line.** `material_lines` is edited by whole-task delete-and-reinsert
   (2.4b), so tying a stock decrement to a line's persistent identity would
   be fragile (a re-edit has no stable row to reverse against). Instead,
   when a take-off line's item/unit matches an existing positive stock
   balance, the form shows the on-hand quantity (point 5) and a bounded
   "Apply from stock" quantity input (capped at the lesser of the line's
   `qtyOriginal` and the current balance); submitting the take-off records
   one `drawn_into_takeoff` movement for the applied amount, referencing
   the task. The take-off line itself still records its full required
   quantity (unchanged) — only the *procurement* need shrinks by the
   applied amount, which is exactly Phase 1's "orders only what's not
   already on site" requirement, satisfied without needing per-line
   identity to survive edits.

5. **Written Off decrements the same way, from Stage Closeout.** When a
   surplus line resolves to Written Off instead of Carried Forward, no
   `material_stock_movements` row is written for that material *as
   surplus* (nothing is added to the ledger to begin with) — Written Off
   only decrements existing on-hand stock when the loss is discovered
   against material already sitting in the ledger from an earlier
   carry-forward (breakage/theft of stock already on site). That case
   writes a `written_off` movement for the lost quantity. A first-time
   surplus that is written off at the same closeout it was created never
   touches the ledger, matching Phase 1 ticket 06 point 3 (no financial
   re-entry needed either way).

6. **Take-off screen surfacing (guidelines' "orders only what's not
   available"):** next to each Material Take-Off line's item field, once
   the typed item/unit matches a ledger balance, show `On site: {qty}
   {unit}` and the bounded "Apply from stock" input from point 4; item
   entry itself gets a plain HTML `<datalist>` autocomplete sourced from
   the distinct `item_key`s already in that Account's stock and recent
   take-off lines — a cheap typo-reduction measure that stops short of a
   full Material List register (point 2's accepted gap).

7. **Explicitly out of scope, restated so the build doesn't drift into
   it:** no UI or schema for Returned to Supplier or Transferred Within
   Same Project (Phase 1 ticket 06 already found neither happens in
   practice) — the `reason` enum has exactly three values
   (`carried_forward`, `drawn_into_takeoff`, `written_off`) and stays
   closed; no cross-project movement path exists at all, not even as an
   admin-only escape hatch, since Phase 1 ticket 06 requires any such move
   to be an explicit accounting adjustment outside this ledger's ordinary
   flow.

### Consequences for the spec

- New table `material_stock_movements` (account-scoped, RLS, append-only —
  no update/delete DAL, mirroring the Delivery/Payment reversal convention
  but with no reversal operation defined here since nothing yet needs to
  undo a stock movement; add one only if a real correction need surfaces
  during the build).
- Stage Closeout (ticket 05) owns calling `carryForwardSurplus` /
  the Written-Off path; this ticket owns the ledger's shape and the
  take-off-side read/write. Interface only, not sequencing — either can be
  built first as long as the write contract above is honored.
- The Material List register (multi-tenancy ticket 01) stays formally
  unbuilt and is **not** resurrected by this ticket; flagged below as
  fog for a future ticket if item-name drift proves painful in practice.
- `material_lines` schema is unchanged; no new column there. The "applied
  from stock" amount lives only as a `material_stock_movements` row, not as
  a field on the take-off line.

## Not yet specified

- The **Material List register** (per-Account material/unit-price price
  book) was named as a v1 requirement in multi-tenancy ticket 01 but was
  never built (Stage Templates were; Material List wasn't). This ticket
  works around its absence with a normalised-text-key match plus a
  `<datalist>` autocomplete. If item-name fragmentation turns out to matter
  in real use, promoting free-text material names to a real register
  (giving `material_stock_movements.item_key` and `material_lines.item` a
  proper foreign key) is a clean follow-up ticket — not blocking Phase 3.
