# Slice 3.4 — Stage Closeout workflow — runbook

> **Verified 2026-09-15** — CI run `34907575625` on PR #4 green: `lint`,
> `typecheck`, migrations, the Testcontainers isolation suite and
> `npm run build` all ✓.

## What changed

Implements ticket 05 (`.scratch/phase3/issues/05-stage-closeout-workflow.md`)
in full, wiring in Slice 3.2's Budget Variance card and Slice 3.3's Material
Stock ledger read-only, per their runbooks' documented interfaces.

### Schema — no migration

No new column, no new enum value. `stages.status` already had `completed`
and `ready_for_closeout` (added ahead of need in migration
`0002_domain_structure`, anticipating exactly this ticket). Confirmed by
generating against the isolated-Linux-`drizzle-kit` scratch procedure
(throwaway copy of `package.json` + `package-lock.json` + `drizzle.config.ts`
+ `src/` + `drizzle/`, `npm install --ignore-scripts`, `npx drizzle-kit
generate`): output was **"No schema changes, nothing to migrate"** — zero
drift, no migration generated or committed. The next migration number stays
`0010_*` for whichever slice needs it next (likely 3.5).

### View model — `src/lib/stage-closeout.ts` (new, no `server-only`)

Pure, client-safe, mirrors `src/lib/variations.ts` / `src/lib/procurement.ts`:

- `StageCloseoutGates` — the four hard-check inputs: `openTasks`,
  `nonTerminalVariations`, `orderedPurchaseOrders` (each a small ref list for
  display), and `openLabourCommitments` (a number, reusing
  `StageFinancials.openLabourCommitments` — no new computation).
- `stageCloseoutBlockers(gates)` — the four checks evaluated in order, each
  producing a `{key, label}` entry only when it actually blocks.
- `CLOSEABLE_STAGE_STATUSES` = `{active, ready_for_closeout}` (ticket 05 §2).
- `canCloseStage(status, gates)` = right starting status AND zero blockers.
- The Client Funds "Stage surplus/shortfall identified" line needed **no new
  function** — it is `@/lib/finance`'s existing `forecastFundingRequirement`
  (positive = shortfall, zero/negative = surplus), read directly by the
  screen.

### DAL — `src/lib/data/stage-closeout.ts` (new)

No `accountId` in any signature (`withAccount` + RLS, standard posture):

- `loadCloseoutGates(tx, stageId)` (internal, `tx`-scoped, not exported) —
  re-derives the four gates from live rows inside a caller's own
  transaction, same posture as `carryForwardSurplus`/`writeOffStock`: avoids
  nesting a second `withAccount`/`db.transaction()` call inside `closeStage`'s
  own transaction (the pool has headroom for it, but every other DAL file
  here deliberately avoids nested transactions, so this follows suit).
- **`getStageCloseoutGates(stageId)`** — the exported, `withAccount`-wrapped
  read the checklist screen calls. Wraps `loadCloseoutGates`.
- **`closeStage(stageId): Promise<CloseStageResult>`** — the atomic `Close
  Stage` transaction (ticket 05 §2): loads the stage, refuses (`"not-found"`)
  if missing, refuses (`"not-closeable-status"`) unless status is `active` or
  `ready_for_closeout`, re-derives the four gates via `loadCloseoutGates` and
  refuses (`"gates-failed"`) if any block — **never trusts the checklist
  screen's own read**, the same defensive re-check every other atomic
  transaction in this codebase does (`issuePurchaseOrder`, `approveVariation`).
  On success: `UPDATE stages SET status = 'completed', completed_on =
  today()`.
- **`resolveSurplusMaterials(stageId, lines): Promise<boolean>`** — the
  post-closeout "Carry Forward Surplus" write (ticket 05 §3, ticket 06 §3/§5):
  refuses (`false`) unless the stage is already `completed`; splits the
  Engineer-entered lines by their per-line `resolution` and calls
  `carryForwardSurplus`/`writeOffStock` (both from `src/lib/data/material-
  stock.ts`, unchanged) inside its own transaction. **Deliberately a separate
  transaction from `closeStage`**, not folded into it — see "Deviations"
  below.

### Validation — `src/lib/validation/stage-closeout.ts` (new)

`surplusLineSchema` / `surplusLinesSchema` — isomorphic Zod, mirrors
`takeOffLineSchema`: `item`, `unit`, `qty` (positive), `resolution`
(`"carry_forward" | "written_off"`). The form posts the array as one JSON
string in a hidden `lines` field, same idiom as `variationIds` in
`actions/funding.ts` and `lines` in `actions/tasks.ts`.

### Actions — `src/app/actions/stage-closeout.ts` (new)

- `closeStageAction(projectId, stageId)` — a plain (non-`useActionState`)
  action: the checklist screen already disables the button unless its own
  re-derived gates are clear, so the only realistic failures are a race or a
  stale reload. Redirects to the closeout screen either way; on a failed
  re-check it appends `?closeError=<reason>` so the screen can show why
  rather than silently no-opping.
- `resolveSurplusMaterialsAction(projectId, stageId, prev, formData)` — a
  `useActionState` action (surfaces Zod field errors / a plain error message
  inline, same as every other form action in this codebase).

### Extended — `src/lib/data/tasks.ts`

`stageBudgetLocked` gains a second OR condition (ticket 05 §2's "Freeze
extension"): the previous single-`SELECT` check (Funding Request
issued/closed) is now one `SELECT (EXISTS(...) OR EXISTS(...)) AS locked`
guard, ORing in `stages.status = 'completed'`. A stage that reaches
`completed` with no Issued Funding Request (a trivial stage) now also freezes
its Tasks'/Material Lines' budget numbers.

### Extended — `src/lib/data/tasks.ts`'s `getStageDetail`

Added `completedOn` to the returned stage header fields (previously omitted)
— the closeout screen's "Closed on {date}" banner needed it; every existing
caller destructures via `...stage`, so this is additive and backward
compatible.

### Screens

- **`src/app/(app)/projects/[id]/stages/[stageId]/closeout/page.tsx`** (new)
  — the checklist screen (ticket 05's "controlled closeout workflow"):
  - The four hard checks, each with a pass/fail icon and — when failing — a
    linked list of the actual blocking rows (open tasks, non-terminal
    variations, ordered POs) or the owed amount (labour commitments).
  - `Close Stage` is a plain `<form action={closeStageAction.bind(...)}>`
    with a server-rendered `disabled` button (no client component needed —
    Next.js Server Actions work with a plain disabled submit button).
  - Informational groups (never block): Client Funds (deposits, the stage
    funding position via `forecastFundingRequirement`), Supervisor Fee
    (invoiced/received/outstanding via `supervisorFeePosition`/
    `feeOutstanding`), Materials (links to the Budget Variance card below +
    lists the project's on-site stock balances from `getStockBalances`),
    Labour ("Retention: not used" — always shown, never a checkbox),
    Documents (a reassurance note; "Funding-request record preserved" is
    dropped from the UI as redundant, per ticket 05 §1).
  - Embeds `BudgetVarianceCard` (Slice 3.2, read-only, unmodified) with
    `getAccumulatedMaterialVariance(projectId)`.
  - Once `status === 'completed'`: shows the three post-closeout actions
    (see below) instead of the checklist's Close button.
- **`_components/SurplusMaterialsForm.tsx`** (new, client) — the "Carry
  Forward Surplus" post-closeout form: add/remove material lines
  (item/unit/qty + a per-line Carried Forward/Written Off select), shows the
  project's current on-site stock for reference, submits the whole set as one
  JSON payload to `resolveSurplusMaterialsAction`.
- `src/app/(app)/projects/[id]/stages/[stageId]/page.tsx` — a new secondary
  "Stage Closeout" button in the header, linking to the new route.
- `src/app/(app)/projects/[id]/funding/new/page.tsx` — accepts an optional
  `?stageId=` query param (new — mirrors the existing `?variationId=`
  pattern), given priority in `defaultStageId`'s fallback chain, so "Create
  Next Stage Funding Request" can pre-scope the create form to the specific
  next stage rather than falling back to the project's current stage.

## Deviations from the ticket's prose

- **"Carry Forward Surplus" runs in its own transaction, separate from
  `Close Stage`'s.** The task brief that kicked off this slice's build said
  to call `carryForwardSurplus` "from inside your Close Stage transaction,"
  but ticket 05 §3 itself lists Carry Forward Surplus as one of the **three
  post-closeout** action buttons — i.e., something the Engineer does *after*
  the stage is already `completed`, not a precondition folded into the close
  itself. There is also no existing computation anywhere in this codebase
  that derives "this stage's surplus lines" automatically (no
  over-delivery-minus-consumption calculation exists) — the Engineer must
  type the item/unit/qty by hand regardless, which is naturally a step taken
  once the stage is already closed and being reviewed, not mid-transaction.
  Read literally, this is the more consistent interpretation of ticket 05's
  own "post-closeout actions" framing, and `resolveSurplusMaterials` refuses
  outright unless `stages.status = 'completed'` already, so it can never run
  ahead of or instead of the close itself.
- **`resolveSurplusMaterials` also calls `writeOffStock`, not just
  `carryForwardSurplus`.** Ticket 05's own post-closeout button list names
  only "Carry Forward Approved Surplus Materials," never a separate "Write
  Off" button. But ticket 06's "Consequences for the spec" section states
  plainly: "Stage Closeout (ticket 05) owns calling `carryForwardSurplus` /
  the Written-Off path" — an explicit instruction that this slice must call
  both. Resolved by having the single surplus-lines form let the Engineer
  pick, per line, Carried Forward or Written Off — one screen, one button,
  one submit, satisfying both tickets: ticket 05's UI surface (one "Carry
  Forward Surplus" section/button) and ticket 06's ownership assignment
  (both write paths called from here). Flagged here in case Slice 3.5 (or a
  future reader) expects a visually separate Write Off button — there isn't
  one; it's the same form's per-line resolution choice.
- **The Materials informational group also lists live on-site stock
  balances**, not just a link to the Material Stock page. Ticket 05 §1 says
  the informational display is "of whatever ticket 06 reports as on-hand
  surplus for the stage" — `getStockBalances` is project-wide, not
  stage-scoped (Slice 3.3's own runbook confirms there is no per-stage stock
  view), so the closeout screen shows the project's current on-site balances
  as the closest available reading of that line, labelled "(project-wide)"
  to avoid implying a per-stage figure that doesn't exist.
- **`getStageDetail`'s return type gained `completedOn`.** Not asked for
  explicitly, but needed for the closed-stage banner's "Closed on {date}"
  line and a strictly additive, backward-compatible change (every existing
  caller spreads `...stage`).

## Interface for downstream slices (3.5)

- **The four hard gates, computed live, never stored**:
  `getStageCloseoutGates(stageId): Promise<StageCloseoutGates | null>`
  (`src/lib/data/stage-closeout.ts`) and `stageCloseoutBlockers(gates)` /
  `canCloseStage(status, gates)` (`src/lib/stage-closeout.ts`) — Slice 3.5
  (Financial Reconciliation Engine) can call these directly rather than
  re-deriving "closed stages have no unresolved commitments" (guideline
  check 17) itself.
- **By construction, the four hard gates already guarantee check 17 holds
  for every stage this app allows to reach `completed`** — a stage cannot
  transition to `completed` while it has an open Task, a non-terminal
  Variation, an `ordered` Purchase Order, or a positive
  `openLabourCommitments`, and nothing in this build (or any prior slice)
  can move a `completed` stage's status backward to reopen those
  possibilities. Ticket 04 needs no separate check for this — map.md already
  flagged this as the expected outcome; this slice confirms it holds as
  built, not just as decided.
- **`closeStage(stageId): Promise<CloseStageResult>`** and
  **`resolveSurplusMaterials(stageId, lines): Promise<boolean>`**
  (`src/lib/data/stage-closeout.ts`) — the two writes, for a future screen
  that might want to trigger either without the checklist UI (unlikely
  needed by 3.5, which is read-only, but noted for completeness).

## Verify

```bash
cd web
npm run typecheck   # clean in WSL
npm run lint        # clean in WSL
```

No migration generated (confirmed via the isolated-Linux-drizzle-kit
procedure — see "Schema" above). `db:migrate` / `npm test` / `npm run build`
verified via CI run `34907575625` on PR #4 (green: migrations, `lint`,
`typecheck`, the isolation suite, and `build` all ✓).

## Report back

Commit `535091e` on `phase3-change-forecast-control`; PR #4
(`https://github.com/erickmalz/MHANDISI-MAKINI/pull/4`); CI run
`34907575625` green. No migration needed — confirmed by the isolated
drizzle-kit diff ("No schema changes, nothing to migrate"). The four hard
gates structurally guarantee guideline check 17 ("closed stages have no
unresolved commitments") for Slice 3.5 to rely on without re-checking it.
Slice 3.4 is done; next is **Slice 3.5** (Financial Reconciliation Engine,
ticket 04).
