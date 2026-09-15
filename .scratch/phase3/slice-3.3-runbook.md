# Slice 3.3 — Surplus Material Handling + Material Stock ledger — runbook

> **Verified 2026-09-14** — CI run `34904957426` on PR #4 green: `lint`,
> `typecheck`, migrations (incl. `0009`), the Testcontainers isolation suite
> and `npm run build` all ✓.

## What changed

Implements ticket 06
(`.scratch/phase3/issues/06-surplus-material-and-material-stock-ledger.md`)
in full, layered on Slice 3.2's per-line-update Material Take-Off form.

### Schema — migration `0009_material_stock_movements`

- New `src/lib/data/schema/material-stock-movements.ts` —
  `material_stock_movement_reason` enum (`carried_forward |
  drawn_into_takeoff | written_off`, closed at exactly these 3 values —
  ticket 06 §7) and the `material_stock_movements` table: `id`,
  `account_id`, `project_id` (composite FK to `projects (id, account_id)`,
  `ON DELETE CASCADE` — a stock ledger has no life once its project is
  gone), `item_key` / `unit` (both pre-normalised — `lower(trim(...))` — at
  write time, never re-derived at read time), `qty` (signed
  `numeric(14,3)`, same precision as `material_lines.qty_original`),
  `reason`, `source_stage_id` / `task_id` (both nullable, provenance only,
  composite FK'd `ON DELETE NO ACTION` — same posture as
  `material_lines.variation_id`), `created_at`. No `updated_at`, no void
  columns — append-only with no reversal operation defined yet (ticket 06's
  own "add one only if a real correction need surfaces").
- Generated via the isolated-Linux-drizzle-kit scratch procedure (throwaway
  copy of `package.json` + `package-lock.json` + `drizzle.config.ts` +
  `src/` + `drizzle/` in a scratch dir, `npm install --ignore-scripts`
  there, then `npx drizzle-kit generate --name material_stock_movements`).
  Diffed `0008`'s snapshot against the generated `0009` snapshot (one new
  `_journal.json` entry, one new table's worth of DDL): the only
  differences are the new enum, the new table, and its 3 FKs — zero
  unintended drift. The RLS block
  (`app.enable_standard_rls('public.material_stock_movements')`) was
  hand-appended to the generated SQL, same pattern as every prior
  migration.

### DAL — `src/lib/data/material-stock.ts` (new)

No `accountId` in the read functions (`withAccount` + RLS, standard
posture). The two writes designed to run **inside a caller's own
transaction** — `carryForwardSurplus` and `writeOffStock` — take `tx`
directly instead of self-wrapping in `withAccount`, and resolve the account
id themselves via the cached `getCurrentAccountId()` (a session read, not a
transaction-scoped one, so calling it again mid-transaction is free and
safe):

- **`carryForwardSurplus(tx, stageId, lines: {item, unit, qty}[])`** — the
  **only** write path that increments the ledger (ticket 06 §3). One
  `carried_forward` movement per positive line, `source_stage_id` set to
  `stageId`, `project_id` resolved from the stage. This exact name,
  signature, and file path is Slice 3.4 (Stage Closeout)'s contract — it
  calls this from inside its own `withAccount` transaction so the stage's
  status change and the stock increment commit atomically.
- **`writeOffStock(tx, stageId, lines: {item, unit, qty}[])`** — the
  decrement side of ticket 06 §5, symmetric to `carryForwardSurplus` (same
  signature shape) but not itself named in the ticket's prose. Each line's
  write-off is capped at `min(qty, currentBalance)` **inside this
  function** — so a fresh surplus written off at the same closeout that
  discovered it (balance still `0` for that item/unit) writes no movement
  at all, and a loss against material already carried forward writes
  exactly the lost amount. This computes ticket 06 §5's "only when the loss
  is against already-carried-forward material" rule itself, rather than
  pushing that judgement onto Slice 3.4's caller.
- **`drawFromStock(tx, accountId, projectId, taskId, lines)`** (not
  exported from the `@/lib/data` barrel — internal to `tasks.ts`, same
  visibility posture as `insertTakeOffLines`/`applyLockedTakeOffEdits`) —
  the consuming-side decrement (ticket 06 §4). Same `min(requested,
  currentBalance)` cap, applied per line.
- **`getStockBalances(projectId)`** — every item/unit with a positive
  on-hand balance in a project (`SUM(qty) ... HAVING SUM(qty) > 0`). Feeds
  both the Material Stock screen and the Take-Off form's stock lookup.
- **`getStockBalance(projectId, item, unit)`** — single-item balance
  lookup, exported for a future caller that only needs one figure.
- **`listStockMovements(projectId, limit = 50)`** — the ledger's own recent
  history, newest first (ticket 06 §1's "audit trail... for free").
- **`listKnownMaterialItems()`** — account-wide distinct item names for the
  Take-Off form's `<datalist>` (ticket 06 §4/§6): the ledger's own
  `item_key`s (already normalised) unioned with the 200 most recently used
  `material_lines.item` values (original casing kept). A cheap typo-drift
  mitigation, not a real Material List register — ticket 06 §2's accepted
  gap.

### Validation — `src/lib/validation/tasks.ts`

- `takeOffLineSchema` gains `applyFromStock` (optional, non-negative,
  coerced number) — the form's "Apply from stock" amount. Never persisted
  on the line; only read once, at submit time, to write a
  `drawn_into_takeoff` movement.

### DAL — `src/lib/data/tasks.ts` (extended, not rewritten)

- `createTask` / `updateTask` both now also select the task's `projectId`
  (via `stages`) and, after their existing take-off write (delete-and-
  reinsert or `applyLockedTakeOffEdits`, unchanged), call `drawFromStock`
  for every submitted line with a positive `applyFromStock` — independent
  of the pre/post-lock branch, since applying from stock only shrinks the
  *procurement* need, never the take-off line's own required quantity
  (ticket 06 §4). Runs inside the same transaction as the rest of the
  Task write, so a stock draw and its take-off edit commit together.

### Screens

- **`src/app/(app)/projects/_components/TaskForm.tsx`** (extended) — each
  take-off line's item input gets `list="material-item-options"` (the new
  `<datalist>`, populated from `knownItems`); once a line's typed item/unit
  matches a positive balance in `stockBalances`, an "On site: {qty} {unit}"
  hint and a bounded "Apply from stock" number input appear beneath the
  line, capped client-side at `min(the line's own qty, the balance)` — the
  DAL re-caps the same way server-side regardless. New props:
  `stockBalances?: {itemKey, unit, qty}[]`, `knownItems?: string[]`, both
  defaulting to `[]`.
- Both pages that render `TaskForm` — `stages/[stageId]/tasks/new/page.tsx`
  and `tasks/[taskId]/edit/page.tsx` — now also fetch
  `getStockBalances(projectId)` and `listKnownMaterialItems()` and pass
  them through.
- **`src/app/(app)/projects/[id]/material-stock/page.tsx`** (new) — the
  per-project "Material Stock" screen (ticket 06's "current Material Stock
  on hand per project"): an "On site" balance table plus a "Recent
  movements" list (ticket 06 §1's audit trail, shown for free). Linked from
  the project overview page (`projects/[id]/page.tsx`) as a new "Material
  stock" secondary button, placed the same way Purchase Orders / Funding
  Requests already are (the closest existing convention for a per-project
  register-style screen — Suppliers/Subcontractors are Account-wide
  registers, not per-project, so that placement didn't fit).

## Deviations from the ticket's prose

- **`writeOffStock` is a build addition, not literally named in ticket
  06's decision text.** The ticket names `carryForwardSurplus` explicitly
  as "ticket 05 calls a write this ticket defines," but only describes the
  Written Off decrement *rule* (§5) without naming its function. Since "no
  UI or schema for Returned to Supplier/Transferred" (§7) still leaves
  Written Off's decrement needing a home, and ticket 06 states it "owns the
  ledger's shape... and the take-off-side read/write," `writeOffStock` was
  added as the natural, symmetric completion — Slice 3.4 should call it the
  same way it calls `carryForwardSurplus`. Flagged here so 3.4 doesn't
  reinvent this or assume Written Off has no ledger-writing counterpart.
- **Item display capitalisation.** The ticket's literal column list for
  `material_stock_movements` has no separate "display name" column — only
  `item_key` (normalised, lowercase). The Material Stock screen shows
  `item_key` as-is with a CSS `capitalize` transform rather than adding a
  schema column for original casing, since the schema shape was ticket
  06's own explicit design (point 1) and a display-only concern doesn't
  warrant reopening it.
- **`getStockBalance` (singular) is exported but currently unused** outside
  this file — added for Slice 3.4 or a future caller that only needs one
  item's figure without loading the whole project balance list; not
  dead-code risk since it is barrel-exported.
- **No standalone reversal/void operation**, per the ticket's own
  "Consequences for the spec" note — none was needed for this slice's
  build.

## Interface for downstream slices (3.4, 3.5)

- **`carryForwardSurplus(tx: AccountTx, stageId: string, lines: {item:
  string, unit: string, qty: number}[]): Promise<void>`** —
  `src/lib/data/material-stock.ts`. Call once from inside Stage Closeout's
  own `withAccount` transaction when its Materials checklist step resolves
  one or more lines to Carried Forward. Silently no-ops on an empty/all-
  non-positive `lines` array or a missing/cross-account `stageId`.
- **`writeOffStock(tx: AccountTx, stageId: string, lines: {item: string,
  unit: string, qty: number}[]): Promise<void>`** — same file, same
  calling convention, for the Written Off path. Self-caps at the current
  balance, so it is always safe to call with every Written Off line
  regardless of whether that material was ever carried forward.
- **Stock-on-hand, read-only**: `getStockBalances(projectId: string):
  Promise<{itemKey: string, unit: string, qty: number}[]>` —
  `src/lib/data/material-stock.ts`, exported from `@/lib/data`. This is
  what backs the Material Stock screen
  (`src/app/(app)/projects/[id]/material-stock/page.tsx`) and is the
  figure Slice 3.4 should read to show current stock read-only on its own
  Stage Closeout screen (either by importing the same function, or linking
  to the Material Stock page).
- **`material_stock_movements`** — `reason` is a closed 3-value enum;
  never add a 4th value for Returned to Supplier / Transferred Within Same
  Project (ticket 06 §7, Phase 1 ticket 06).

## Verify

```bash
cd web
npm run typecheck   # clean in WSL
npm run lint        # clean in WSL
```

Migration `0009` generated + diffed via the isolated-Linux-drizzle-kit
procedure (see above) — zero unintended drift confirmed locally.
`db:migrate` / `npm test` / `npm run build` verified via CI run
`34904957426` on PR #4 (green: migrations incl. `0009`, `lint`,
`typecheck`, the isolation suite, and `build` all ✓).

## Report back

Commit `7c63abd` on `phase3-change-forecast-control`; PR #4
(`https://github.com/erickmalz/MHANDISI-MAKINI/pull/4`); CI run
`34904957426` green. Slice 3.3 is done; next is **Slice 3.4** (Stage
Closeout workflow, ticket 05) — it should call `carryForwardSurplus` /
`writeOffStock` from `src/lib/data/material-stock.ts` and read
`getStockBalances(projectId)` for its read-only stock display.
