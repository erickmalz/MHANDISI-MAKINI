# Slice 4.2 — Stage Closeout Report — runbook

> **Built — pending integration + CI verification**

## What changed

Implements ticket 03
(`.scratch/phase4/issues/03-stage-closeout-report.md`) in full: the Stage
Closeout Report is now a fourth issued-document kind, frozen inside the
existing `closeStage` transaction (Phase 3 Slice 3.4) at the moment a Stage
closes — Close Stage *is* issuing the report, exactly as the ticket's
resolved answer specifies. No separate "Run Report" action exists.

### Schema — new table, no migration file generated here

**`stage_closeouts`** (`web/src/lib/data/schema/stage-closeouts.ts`, new):
`id`, `account_id`, `stage_id` (`UNIQUE`), `base_number`, `display_number`,
`document_snapshot` (jsonb, typed `DocumentSnapshot`), `closed_on`,
`created_at`. Composite FK to `stages (id, account_id)`, `ON DELETE CASCADE`
— same shape as `funding_requests`/`fee_invoices`/`purchase_orders`.

**Table vs. column decision**: a **new table**, not a `document_snapshot`
column on `stages` directly. `stages` is a long-lived, frequently-read row
(every Stage detail/list screen touches it); a Stage Closeout Report is a
one-time write at the very end of a Stage's life. A separate table:

- keeps that one-time-write JSONB blob off a hot row,
- gives the report its own PK/row other code can reference later (matching
  every other issued document — none of the other three freeze their
  snapshot onto a shared parent row either),
- and makes "does this stage have a report" a plain existence check
  (`stage_closeouts` row present/absent) rather than a nullable-column check
  on `stages`, which reads more naturally for the "closed before this
  feature shipped" case the ticket calls out.

**`document_number_type` enum** (`schema/enums.ts`) gains a fifth value,
`stage_closeout_report`, appended after `variation`. `claimDocumentNumber`'s
`type` parameter (`document-numbers.ts`) is extended to match.

**No migration file is added or generated** — the hard constraint (and this
repo's standing "migration generation is centralized after integration"
rule) means only the Drizzle schema `.ts` is written here. Next migration
number at the time of writing: `0010_*`. Whoever generates it needs the
standard hand-merged RLS block for the new table
(`app.enable_standard_rls('stage_closeouts')`), same as every other Slice 2.1+
table.

### Document number scheme chosen

**`SCR-{project_code}-{NNN}`** — same shape as `FR-`/`PO-`/`FI-`/`VO-`,
minted via the existing `claimDocumentNumber` counter (not the Stage's own
`seq`, which the ticket's prose floated as an alternative). Reusing the
shared per-project/per-type counter, rather than the Stage's `seq`, keeps
every issued-document number gap-free-and-never-reused under the *same*
mechanism (ticket 10 §8) instead of adding a second numbering idea; a Stage's
`seq` is also not guaranteed to be a stable, print-worthy identity the way a
counter-claimed number is (a Stage can be inserted/renumbered before any of
this existed — Slice 2.1 territory, not re-litigated here).

### `DocumentSnapshot` — `web/src/lib/data/schema/snapshot.ts`

Added as a clean, appended block right after `PurchaseOrderSnapshot`, per the
task's own instruction (Slice 4.3 is adding a fifth variant to this same file
concurrently in a sibling worktree):

- `StageCloseoutMaterialStockLine` (small helper type: `itemKey`/`unit`/`qty`
  — the frozen copy of one `StockBalance` row).
- `StageCloseoutReportSnapshot extends DocumentSnapshotBase`, `kind:
  "stage_closeout_report"`. Beyond the base fields:
  - `financialCheckStatus: "passed" | "warning" | "critical"` — the
    Reconciliation Engine's rollup at the moment of closing (§50's
    `financial_check_status`).
  - The five §50 `*_reconciled` booleans verbatim:
    `materialsReconciled`, `labourReconciled`, `documentsReconciled`,
    `feeReconciled`, `clientFundsReconciled`.
  - The actual figures behind them (ticket's own "plus the actual figures,
    not just booleans"): `stageBudget`/`actualCost` (combined),
    `materialEstimated`/`materialActual`/`materialVariance`/
    `accumulatedMaterialVariance`, `labourAgreement`/`labourActual`/
    `labourVariance`, `feeInvoiced`/`feeReceived`/`feeOutstanding`,
    `clientDeposits`/`forecastFundingRequirement`,
    `materialStockSurplus: StageCloseoutMaterialStockLine[]`.
  - `sections`/`total` (from the base) carry the Material/Labour Budget
    Variance breakdown as two `SectionTable` sections, `total` = the Combined
    Budget Variance — mirrors the on-screen `BudgetVarianceCard` exactly.
  - `counterpartyName` (base) holds the Project's client name — this report
    has no Client/Supplier party the way a Funding Request/Purchase Order
    does, but the ticket's own reasoning is that a client might reference
    this report later too, so it's named the same way.
  - `notes` (base, optional) freezes the Stage's own live `notes` column —
    the closest existing field to §38's "unresolved notes" line; there is no
    separate notes-taking step anywhere in the Stage Closeout workflow.
- `DocumentSnapshot` union: only the final `export type` line touched, to
  append `StageCloseoutReportSnapshot`.

### `DocumentInput` — `web/src/lib/data/documents.ts`

Added `StageCloseoutReportDocument` (fourth interface, same shape as the
other three: `kind`, `projectId`, `snapshot`, `stamp`, `profile`) and
`getStageCloseoutReportDocument(stageId)` (keyed by **stage id**, not a
report id — matches how the closeout route already addresses the stage).
`stamp` is always `null` — a Stage Closeout Report has no supersede / cancel
/ paid lifecycle to reflect. `DocumentInput` union: only the final `export
type` line touched, to append the fourth variant — same additive discipline
as `snapshot.ts`.

### DAL — `web/src/lib/data/stage-closeout.ts`

`closeStage` extended in place (same transaction, same function signature,
same `CloseStageResult` return type — the action/screen contract is
untouched):

1. `getCurrentAccountId()` resolved up front (needed for `claimDocumentNumber`
   and the `stage_closeouts` insert).
2. **`getStageReconciliationReport(stageId)`** (Phase 3 Slice 3.5) called
   **before** the atomic transaction opens — deliberately a separate
   `withAccount` call, not nested inside it. Every other tx-scoped helper in
   this DAL already avoids nesting a second `withAccount`/`db.transaction()`
   inside a caller's own (`loadCloseoutGates`'s own doc comment states this
   explicitly), and folding the Reconciliation Engine's full ~19-query set
   into the atomic close would add real weight for a field that is purely
   informational and never gates closeout (guidelines §34). Accepted
   trade-off: a theoretical one-heartbeat race against a concurrent edit,
   same class of risk as other "read, then act" sequencing already in this
   codebase. If `reconciliation` somehow resolves `null` (a race on the
   stage's own existence — `closeStage` re-confirms the stage exists moments
   later), `financialCheckStatus` is written as `"warning"`, never a silent
   `"passed"`.
3. Inside the transaction: existing gate re-checks unchanged, then (new)
   `computeStageFinancials`, `accumulatedMaterialVarianceTx`,
   `stockBalancesTx` — all three already-existing computations, called
   `tx`-scoped so they commit atomically with the `stages.status` flip and
   the `stage_closeouts` insert.
4. Mints `SCR-{project_code}-{NNN}`, assembles the snapshot, writes both the
   `stages` update and the `stage_closeouts` insert in the same transaction.

**Two small `tx`-scoped extractions**, both additive/backward-compatible
(the exported `withAccount`-wrapped functions keep their exact old
signature and behavior):

- `web/src/lib/data/projects.ts`: `getAccumulatedMaterialVariance(projectId)`
  now wraps a new exported `accumulatedMaterialVarianceTx(tx, projectId)` —
  the same SQL, just pulled out so `closeStage` can call it on its own `tx`
  without nesting a transaction.
- `web/src/lib/data/material-stock.ts`: `getStockBalances(projectId)` now
  wraps a new exported `stockBalancesTx(tx, projectId)`, same pattern.

**New read**: `getStageCloseoutReportSummary(stageId): Promise<{
displayNumber, closedOn } | null>` — a light existence check for the
Closeout screen's own "which branch to show" decision, deliberately not the
full `getStageCloseoutReportDocument` (which also loads the Account's
letterhead profile, unneeded here).

**`*Reconciled` boolean mapping** (judgment call, no ticket-literal
definition exists for these beyond §50's column names):
`materialsReconciled`/`labourReconciled` are written as `true`
unconditionally — two of Stage Closeout's four hard gates (no `ordered`
Purchase Order; zero Open Labour Commitments) already guarantee this for
any Stage that reaches `completed`, so the boolean states a fact already
proven by the gate re-check moments earlier, not a new derivation.
`documentsReconciled` is also always `true` — the Documents group on the
Closeout screen has no live check behind it at all (purely informational
text); recorded for §50 column-list symmetry, not because anything is being
verified. `feeReconciled` (`feeOutstanding(f) <= 0`) and
`clientFundsReconciled` (`forecastFundingRequirement(f) <= 0`) are the two
genuinely derived flags — neither is a gate (Phase 1 decision 03: fee
outstanding never blocks closeout), so either can read `false` on a report,
which is intentional and matches how the checklist screen itself shows
these as informational-only today.

### Template — `web/src/lib/documents/templates/StageCloseoutReportDoc.tsx`

New, following `FeeInvoiceDoc.tsx`'s structure most closely (uses
`showUnitColumns={false}` on `SectionTable` — these aren't priced/qty line
items). Sections, top to bottom: meta grid (Project/Client/Site/Stage/
Closed/Financial check at close), a "Stage budget vs. actual" callout,
Material + Labour `SectionTable`s, the Combined Budget Variance
`GrandTotal`, an Accumulated Material Variance callout, Fee position table,
Client-fund position table, Materials on-site surplus table, a
Reconciliation-at-close table (the five booleans as Reconciled/Not
reconciled rows), and — when the Stage had one — the frozen `notes` as an
"Unresolved notes" `TextBlock`. No changes to `parts.tsx` or `print-css.ts`
— every element reuses existing shared building blocks/CSS classes
(`.section`/`.lines`/`.num`/`.callout`/`.total`), so nothing needed adding
there.

`web/src/lib/documents/templates/render-html.tsx`: one new `case
"stage_closeout_report"` arm in `pickTemplate`'s switch.

### Screen — Stage Closeout page

`web/src/app/(app)/projects/[id]/stages/[stageId]/closeout/page.tsx`: fetches
`getStageCloseoutReportSummary(stageId)` alongside the existing
`Promise.all` reads. When the stage `isClosed`:

- **Report exists** → reuses the existing `DocumentDownloads` component
  (`@/components/DocumentDownloads`, the same one Funding Request/Purchase
  Order detail screens use) with a PDF/JPG link pair.
- **No report row** (closed before this feature shipped) → a plain `Card`
  reading "Report not available — this stage was closed before this feature
  existed," per the ticket's exact wording. No date-based check needed
  (e.g. a `FEATURE_SHIP_DATE` constant) — presence/absence of the
  `stage_closeouts` row already fully captures "closed by the old code path
  vs. the new one," since every close from this point forward always writes
  one.

### Routes (new)

- `web/src/app/(app)/projects/[id]/stages/[stageId]/closeout/document.pdf/route.ts`
- `web/src/app/(app)/projects/[id]/stages/[stageId]/closeout/document.jpg/route.ts`

Both follow the exact `serveDocument(load, belongsToRoute, format)` pattern
the Purchase Order / Funding Request routes already use — no changes to
`web/src/lib/documents/response.ts`, `render.ts`, or `browser.ts` (all three
are already fully generic over `DocumentInput`).

### Barrel — `web/src/lib/data/index.ts`

Added `getStageCloseoutReportDocument` + `StageCloseoutReportDocument` to
the `./documents` export block, and `getStageCloseoutReportSummary` to the
`./stage-closeout` export block. `accumulatedMaterialVarianceTx` /
`stockBalancesTx` are **not** barrel-exported — they're `tx`-scoped internal
helpers, imported directly module-to-module (same posture as
`carryForwardSurplus`/`writeOffStock`'s own direct import into
`stage-closeout.ts`, which predates this slice).

## Deviations / judgment calls from the ticket's prose

- **Document number scheme**: the ticket floated `SCR-{project_code}-
  {stage_seq}` as one possibility; built as `SCR-{project_code}-{NNN}` via
  the shared `claimDocumentNumber` counter instead, for consistency with
  every other issued document's numbering mechanism (see "Document number
  scheme chosen" above).
- **`getStageReconciliationReport` runs before, not inside, the atomic
  `closeStage` transaction** — a deliberate sequencing choice to avoid
  nesting a second `db.transaction()`/`withAccount` call and to keep the
  atomic close itself cheap; documented in-line in `stage-closeout.ts` and
  above. `financial_check_status` is informational only (guidelines §34),
  so this is treated as an acceptable trade-off, not a correctness gap.
- **`*_reconciled` booleans have no ticket-literal definition** beyond §50's
  column names existing. Mapped as described above (two gate-backed facts,
  one always-true informational flag, two genuinely derived flags) —
  flagged here in case a future reader expects a different mapping.
- **`accumulatedMaterialVariance` (project-wide) is included in the
  snapshot**, beyond what the ticket's prose literally asked for
  (stage-level "Material variance"). The on-screen `BudgetVarianceCard` the
  ticket says to reuse always shows this figure right alongside the
  stage-level one, so freezing it too — rather than dropping half of an
  already-fetched, already-displayed card — seemed the more faithful
  reading of "reuse these existing computations."

## Interface for integration (Slice 4.3 / merge)

- **Shared-file touch points**: `schema/snapshot.ts` (one new interface
  block + one appended union member) and `data/documents.ts` (one new
  interface + one new function + one appended union member) — both edits
  are purely additive at the very end of each file's relevant list, per the
  task's own "keep it additive and easy to merge" instruction. No existing
  line in either file was changed beyond the two union `export type`
  statements.
- **`schema/index.ts`**: one new `export * from "./stage-closeouts"` line
  appended at the end (after the Slice 3.3 comment block) — additive.
- **`schema/enums.ts`** / **`data/document-numbers.ts`**: `stage_closeout_report`
  appended as the fifth enum value / fifth union member respectively —
  additive; nothing renumbered or reordered.
- **Migration**: none generated by this slice (hard constraint). At
  integration, `stage_closeouts` (this slice) and whatever Slice 4.3 adds
  for Project Closeout need to land in the same generation pass (or two
  passes against the same base) the way `phase4/status.md`'s own
  integration-order note anticipates ("4.2 + 4.3 together ... merged and
  typechecked as a pair").

## Verify

```bash
cd web
npx next typegen   # generates .next/types — needed once per fresh checkout/worktree
                    # before `tsc` can resolve `PageProps`/`RouteContext`/`LayoutProps`;
                    # unrelated to this slice's own changes (every route/page file in
                    # the repo needs it, confirmed via a pre-edit baseline run)
npx tsc --noEmit
npx eslint <changed files>
```

`db:migrate` / `npm test` / `npm run build` not run locally per this repo's
standing WSL constraint (`.scratch/phase4/status.md`) — CI verifies those
against its own throwaway Postgres once a migration is generated at
integration.

## Report back

Built on branch `phase4-site-history-reporting`, in an isolated worktree,
not yet committed to the shared branch (per this slice's own instructions —
local commit only, no push, no PR). Files created/changed listed above under
"What changed." `stage_closeouts` chosen as a new table over a `stages`
column (see "Table vs. column decision"); `SCR-{project_code}-{NNN}` chosen
as the numbering scheme (see "Document number scheme chosen"). Open
questions: the `*_reconciled` boolean mapping and the
pre-transaction-vs-nested placement of the Reconciliation Engine call are
both judgment calls with no single ticket-literal answer — flagged above for
a reviewer to confirm or override during integration.
