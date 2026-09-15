# Slice 4.3 — Project Closeout — runbook

**Verified 2026-09-15** — CI run `35028451814` on PR #5 green: `lint`, `typecheck`, migrations (incl. `0010`), the isolation suite, and `build` all ✓.

Implements ticket 04 (`.scratch/phase4/issues/04-project-closeout.md`) in
full, including its "Correction found at build-planning time" note:
`projects.status`/`projects.completed_on` already existed (Phase 2), so this
slice adds only the *gate* — the sanctioned `completeProject`/`archiveProject`
Server Actions alongside `ProjectForm.tsx`'s existing raw status dropdown,
left untouched, mirroring Phase 3's `closeStage` vs. `StageForm.tsx` shape.

Built in an isolated worktree in parallel with Slice 4.2 (Stage Closeout
Report), per `.scratch/phase4/status.md`'s parallelisation plan. Slice 4.2's
work is **not present in this worktree** — see "Stage Closeout Report
dependency" below for how that was handled.

## Schema — no migration generated (per the hard constraint)

Two additive schema-only changes, `.ts` only, nothing under `web/drizzle/`:

- **`web/src/lib/data/schema/enums.ts`** — `documentNumberType` gains
  `project_closeout_report`. Checked for a `stage_closeout_report` sibling
  value from Slice 4.2 first (ticket says "add yours alongside it
  additively, don't overwrite") — not present in this worktree, since 4.2 is
  building concurrently in its own worktree; only mine was added. The
  integrator should confirm both values land together, in whichever order,
  when the two branches merge.
- **`web/src/lib/data/schema/project-closeouts.ts`** (new) — the
  `project_closeouts` table: `id`, `account_id`, `project_id` (composite FK
  to `projects (id, account_id)`, `ON DELETE CASCADE`), `display_number`,
  `document_snapshot` (jsonb, `DocumentSnapshot`-typed, `NOT NULL`),
  `created_at`. `UNIQUE (project_id)` — one row per project, since Complete
  only ever runs once (no re-complete flow; Archive writes no new snapshot).
  Exported from `schema/index.ts` with a comment flagging the migration
  number as TBD (next free slot after whichever of 4.1/4.2 lands first —
  confirmed the current highest is `0009_material_stock_movements`).

### Table vs. column decision: **new table**

The ticket left this open, defaulting to a new table "for the same reasons"
Stage Closeout Report's own open question did. Went with the default,
reasoning written into `project-closeouts.ts`'s own doc comment:

- `projects` already carries one genuinely optional one-time-write column
  (`completed_on`); a second (`document_snapshot` jsonb, needed only once,
  only after Complete) starts accumulating exactly the kind of write-once
  baggage a wide, frequently-read row shouldn't carry.
- A dedicated table gives the report its own primary key, ready for a future
  second closeout-adjacent record with no further `projects` migration.
- It's structurally closer to this schema's existing "a snapshot and nothing
  else on the row" precedent (`attachments`) than to `funding_requests`/
  `purchase_orders`, which freeze in place on a row that already has a full
  lifecycle of its own — a completed `projects` row has no such lifecycle
  left to carry a snapshot column through.

### Document numbering

`PCR-{project_code}-{seq}` — same `{PREFIX}-{project_code}-{pad3(seq)}` shape
as `FR-`/`PO-`/`VO-`/`FI-`, via the existing `claimDocumentNumber` helper
(now typed for the new `"project_closeout_report"` value) and `pad3`. Always
`-001` in practice (Complete only ever runs once per project), but goes
through the same gap-free per-project counter as every other document type
rather than being hardcoded, for consistency and to absorb the rare case of
a failed/retried Complete attempt cleanly.

## Pure view module — `web/src/lib/project-closeout.ts` (new, no `server-only`)

Mirrors `src/lib/stage-closeout.ts` one level up:

- `ProjectCloseoutGates` — `{ hasStages: boolean; openStages: [...] }`.
- `TERMINAL_STAGE_STATUSES = {completed, cancelled}` — **a judgment call**:
  the ticket's Answer says Complete is "gated on every one of the project's
  Stages already being `completed`," but read literally that would make any
  project with one abandoned (`cancelled`) Stage permanently uncompletable.
  `stage-closeout.ts`'s own four gates already treat `cancelled` as a
  terminal, non-blocking status for both Tasks and Variations (only
  `draft`/`approved` Variations block; `completed`/`cancelled` Tasks both
  satisfy the "every task terminal" check) — this slice applies the same
  terminal-status posture one level up rather than a literal single-status
  match. Documented in the module's own doc comment for whoever reviews this
  next.
- `projectCloseoutBlockers(gates)` — one check, evaluated same as
  `stageCloseoutBlockers`: a project with **zero stages** is its own named
  blocker (`no-stages`), not silently vacuously-true — a freshly created,
  still-empty project completing immediately was judged unintended.
- `COMPLETABLE_PROJECT_STATUSES = {active, on_hold}`,
  `ARCHIVABLE_PROJECT_STATUSES = {completed}`.
- `canCompleteProject(status, gates)` / `canArchiveProject(status)`.

## DAL — `web/src/lib/data/project-closeout.ts` (new)

No `accountId` in any read signature (`withAccount` + RLS, standard posture).

- `loadCloseoutGates(tx, projectId)` (internal, `tx`-scoped) — re-derives the
  one gate from live Stage rows inside a caller's own transaction, same
  posture as `stage-closeout.ts`'s `loadCloseoutGates`: avoids nesting a
  second `withAccount`/`db.transaction()` inside `completeProject`'s own.
- **`getProjectCloseoutGates(projectId)`** — the exported, `withAccount`-
  wrapped read the checklist screen calls.
- **`sumFinancials(list: StageFinancials[])`** — elementwise sum of every
  stage's already-computed `StageFinancials` (ticket's Answer: "summing the
  already-computed per-stage figures ... rather than a new project-wide
  financial calculation engine"). The result is itself a valid
  `StageFinancials`, so `@/lib/finance`'s `availableFloat`/
  `materialVariance`/`labourVariance` apply to it directly — reused, not
  re-derived, keeping "one authoritative calculation path" (guidelines §51)
  intact at project scope.
- **`getProjectSupplierBalances` / `getProjectSubcontractorBalances`**
  (internal) — see "Supplier/Subcontractor balances" below.
- **`getApprovedVariationLines`** — every `approved` Variation across the
  project's stages; line amount = `materialImpact + labourImpact`
  (`feeImpact` is a carried note only per `schema/variations.ts`, folded
  into the line's `description` instead of its amount).
- **`getOutstandingDocumentLines`** — see "Outstanding documents" below.
- **`assembleCloseoutSnapshot`** (internal) — builds the full
  `ProjectCloseoutReportSnapshot` from the above.
- **`completeProject(projectId): Promise<CompleteProjectResult>`** — the
  atomic transaction: loads the project, refuses (`"not-found"`) if missing,
  refuses (`"not-completable-status"`) unless `status` is `active`/`on_hold`,
  re-derives the one gate via `loadCloseoutGates` and refuses
  (`"gates-failed"`) if it blocks — never trusts the checklist screen's own
  read, same defensive posture as `closeStage`. On success: claims the
  document number, assembles and inserts the frozen snapshot row, then
  `UPDATE projects SET status = 'completed', completed_on = today()`.
- **`archiveProject(projectId): Promise<ArchiveProjectResult>`** — much
  smaller, per the ticket: refuses (`"not-found"` / `"not-archivable-status"`)
  unless `status = 'completed'`, then a plain status flip. No new snapshot,
  no un-archive flow, exactly as specified.

### Supplier/Subcontractor balances

The ticket says reuse `web/src/lib/data/statements.ts` rather than
recomputing balances from scratch. Its exported `getSupplierStatement` /
`getSubcontractorStatement` are **account-wide, all-time** by design
(Operational Control decision 5 — a Statement is a per-register-entry view,
not a per-project one), so they can't be called directly for a project-scoped
figure. `getProjectSupplierBalances`/`getProjectSubcontractorBalances` in the
new DAL file instead run the **exact same formula** those functions use
(`max(0, ordered/agreed total − paid)`, floored per-order/per-task then
summed, non-cancelled records only) as their own project-scoped SQL query —
same calculation, different scope, not a new balance definition. Each
function's doc comment cross-references `statements.ts` explicitly so a
future reader can verify the formulas haven't drifted.

### Outstanding documents

Per the ticket's Answer, this is almost always empty by construction (Stage
Closeout's own four gates already forbid an open Task / non-terminal
Variation / `ordered` PO / open Labour Commitment per stage, and Complete
requires every stage terminal). `getOutstandingDocumentLines` still queries
all three, defensively:

- **Funding Requests** `status = 'issued'` — the one real gap Stage
  Closeout's gates never check (`closeStage` has no Funding Request
  precondition), so this is the genuine "rare cross-stage straggler" the
  ticket names (an issued-but-not-yet-closed Funding Request on an otherwise
  completed stage).
- **Purchase Orders** `status = 'ordered'` and **Variations**
  `status IN ('draft', 'approved')` — included for completeness/defence in
  depth; expected to never fire given the per-stage gates, but a query that
  costs nothing to include rather than an assumption left unchecked.

## Server Actions — `web/src/app/actions/project-closeout.ts` (new)

Mirrors `src/app/actions/stage-closeout.ts`'s shape: `completeProjectAction`
and `archiveProjectAction` are both plain (non-`useActionState`) actions —
the checklist screen already disables its button unless its own re-derived
gate is clear, so the only realistic failures are a race or a stale reload.
Both redirect to `/projects/[id]/closeout`, appending `?completeError=<reason>`
/ `?archiveError=<reason>` on a failed re-check so the screen can explain why.

## Screens

- **`web/src/app/(app)/projects/[id]/closeout/page.tsx`** (new) — the
  checklist screen, same structure as Stage Closeout's own:
  - The one hard check ("Every stage is closed"), pass/fail icon, and —
    when failing — either "this project has no stages yet" or a linked list
    of the actual open stages (via the existing per-stage closeout route).
  - `Complete Project` is a plain `<form action={completeProjectAction.bind(...)}>`
    with a server-rendered `disabled` button.
  - An informational note (never blocks): Supplier/Subcontractor balances
    stay live, current-state screens — Complete triggers no new Statement,
    matching the ticket's Answer.
  - Once `status` is `completed`/`archived`: shows `DocumentDownloads`
    (reused component, same as every other issued document) for the frozen
    report's PDF/JPG, plus — while not yet archived — the `Archive Project`
    form.
- **`web/src/app/(app)/projects/[id]/page.tsx`** — a new secondary
  "Project closeout" link in the header, next to "Save as template", linking
  to the new route. `ProjectForm.tsx`'s own status dropdown is untouched, per
  the ticket's explicit "does not remove or lock" instruction.
- **`web/src/app/(app)/projects/[id]/closeout/document.pdf/route.ts`** /
  **`document.jpg/route.ts`** (new) — reuse `serveDocument` exactly like the
  Purchase Order / Funding Request routes; keyed by `projectId` alone (no
  second id needed — `project_closeouts` is `UNIQUE (project_id)`).

## Rendering — `web/src/lib/documents/templates/ProjectCloseoutReportDoc.tsx` (new)

Reuses `Shell`/`SectionTable`/`GrandTotal`/`Callout`/`TextBlock` from
`parts.tsx` **unmodified** — no edits to that shared file, to keep this
slice's shared-file footprint to exactly the two union files the ticket
named. The four itemised, genuinely-summed groups (Approved Variations,
Supplier Balances, Subcontractor Balances, Outstanding Documents) render
through `snapshot.sections` + `SectionTable` exactly like the other three
documents' line items — zero new list-rendering code. The remaining single
derived figures (Total client funding, Remaining client float, material/
labour/fee totals) aren't itemised lists, so they render through a small
local `Figures` grid defined inside this template file only (not shared).
`GrandTotal` carries the Final Project Variance.

`render-html.tsx` gains one `case "project_closeout_report":` — additive,
same as ticket 04's Answer expected ("both are new cases, not edits to each
other's code").

## Stage Closeout Report (Slice 4.2) snapshot dependency — how it was handled

Ticket 04's Answer says Project Closeout sums per-stage figures "plus each
closed stage's own frozen Stage Closeout Report figures where they exist."
Slice 4.2 is being built **concurrently, in a separate worktree**, and its
`stage_closeout_report` snapshot does not exist in this one. Per the build
brief's explicit fallback instruction, `assembleCloseoutSnapshot` computes
every figure directly from `computeStageFinancials`/live stage data — i.e.
it never attempts to read a Stage Closeout Report snapshot at all, not even
opportunistically.

This should be **numerically equivalent** to what Slice 4.2's own frozen
figures would show at the moment of Complete: both are ultimately sourced
from the same `computeStageFinancials` projection, and nothing between a
stage's Close and the project's Complete can change a completed stage's
frozen budget (Slice 3.4's `stageBudgetLocked` freezes a stage's own
Tasks'/Material Lines' figures once `completed`). The only way they could
drift is if Slice 4.2's snapshot captures a figure this slice doesn't derive
the same way (e.g. a rounding/derivation difference in how it phrases
"materials reconciled" as a boolean vs. this slice's raw variance number).

**Flagged for the integrator**: once Slice 4.2 lands, diff its
`stage_closeout_report` shape against what this slice re-derives live, and
decide whether `completeProject` should switch to reading each stage's
frozen snapshot (via a new getter in Slice 4.2's DAL) instead of
re-computing live — the ticket's own preference order lists the frozen
snapshot first ("plus each closed stage's own frozen ... figures where they
exist"). Re-deriving live is not wrong (same underlying numbers, same
"single authoritative calculation path"), just not the frozen-read Slice 4.2
will make available; switching is a small follow-up, not a rebuild, since
`assembleCloseoutSnapshot`'s shape would stay the same either way.

## Interface for downstream / the integrator

- **`getProjectCloseoutGates(projectId)`** (`src/lib/data/project-closeout.ts`)
  and `projectCloseoutBlockers(gates)` / `canCompleteProject(status, gates)`
  (`src/lib/project-closeout.ts`) — available for a future screen that wants
  the one-gate check without the full closeout page.
- **`completeProject(projectId)`** / **`archiveProject(projectId)`** — the
  two writes, exported from the DAL barrel, for anything that might want to
  trigger either without the checklist UI.
- **`getProjectCloseoutReportDocument(projectId)`** (`src/lib/data/documents.ts`)
  — the fourth `DocumentInput` getter, same shape as the other three.

## Deviations from the ticket's prose

- **`TERMINAL_STAGE_STATUSES` includes `cancelled`, not just `completed`.**
  See "Pure view module" above — a literal single-status reading would make
  any project with one abandoned stage permanently uncompletable, which
  nothing in the ticket intends; this follows the terminal-status precedent
  `stage-closeout.ts` already set for Tasks and Variations.
- **A project with zero stages is its own named blocker**, not a vacuously-
  true pass. Not mentioned in the ticket at all; added defensively since the
  literal "every stage completed" check is trivially true for an empty set.
- **`totalFeesInvoiced`/`totalFeesReceived` instead of a single `totalFees`.**
  §37 names one field ("Total fees"); kept both explicit rather than picking
  one meaning (billed vs. received) silently, since the guidelines elsewhere
  (§6.4, `CONTEXT.md`) already distinguish Fee Invoiced from Fee Received as
  separate figures.
- **Purchase Order / Variation outstanding-document checks are included even
  though Stage Closeout's gates should already prevent them from ever
  firing** — defensive completeness per §37's literal field list, not
  because a gap is expected.

## Self-check

```bash
cd web
npx next typegen && npx tsc --noEmit   # clean
npx eslint <every file listed above>   # clean
```

`web/node_modules` was missing entirely in this fresh worktree (unlike the
main checkout / sibling worktrees, which already had it installed) — symlinked
to the main checkout's `web/node_modules` after confirming both
`package-lock.json` files are byte-identical, purely to run `tsc`/`eslint`
locally. The symlink is untracked (`.gitignore`'d) and not part of this
slice's diff. No migration generated (per the hard constraint — schema `.ts`
only). `db:migrate` / `npm test` / `npm run build` not run locally, per the
standing WSL constraint — CI verifies those.

## Report back

Built, self-checked clean (`tsc --noEmit`, `eslint`), not yet pushed or
opened as a PR (per the task constraints — committed locally on this
worktree's branch only). Files: see the commit. Open questions for the
integrator are the two flagged above (the `document_number_type` sibling
value ordering with Slice 4.2, and whether `completeProject` should later
switch to reading Slice 4.2's frozen per-stage snapshot instead of
re-deriving live).
