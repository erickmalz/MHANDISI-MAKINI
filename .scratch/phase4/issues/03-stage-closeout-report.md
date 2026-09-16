# Stage Closeout Report

Type: grilling
Status: resolved

## Question

Guidelines §38's "Stage Closeout Report" (stage budget, actual cost,
material variance, labour position, fee position, client-fund position,
unresolved notes) was explicitly carved out of Phase 3 by
`.scratch/phase3/issues/07-phase3-scope-boundaries.md`: Phase 3 built the
closeout *workflow* (the checklist gate + `stages.status = 'completed'`
transition) but deliberately not a rendered report artifact, "since it
should design a rendered report artifact ... that waits for Phase 4 to
decide its shape against whatever data Phase 3 actually recorded." Per the
standing memory `mhandisi-makini-issued-documents-need-pdf-and-jpg-export`,
this needs both PDF and JPG. The existing document-rendering module
(`web/src/lib/documents/`) only ever renders a **frozen `document_snapshot`**
captured at Issue time (Funding Request, Fee Invoice, Purchase Order) — it
never reads live domain tables. But Phase 3 confirmed there is no
`stage_closeouts` table; closeout is just a `stages.status` flip with
nothing frozen. Two questions: does this report reuse the existing
rendering module, and if so, what gets frozen and when?

## Answer

**Reuse the existing module** — add a fourth `DocumentInput` kind,
`stage_closeout_report`, alongside `funding_request` / `fee_invoice` /
`purchase_order`. Consistency with every other issued document (same PDF/JPG
pipeline, same frozen-snapshot discipline, same reasons: a report a client
or the supervisor's own records might reference later must read the same
today as it did the day the stage closed, even if a later Variation or
correction touches the stage's live figures) outweighs building a bespoke
live-rendered report just for this one document.

**Freeze the snapshot inside the existing `closeStage` transaction.**
`stage-closeout.ts` / `src/app/actions/stage-closeout.ts` already compute
everything the report needs at the moment of closing — the four gate
checks, the Budget Variance card (ticket 03 of Phase 3), the Material Stock
surplus figures, the fee/client-fund position — because Stage Closeout's
own UI displays them read-only before the Engineer clicks Close Stage. This
ticket extends that same transaction to also write a
`document_snapshot`-shaped JSON blob (matching §50's `stage_closeouts`
column list: `financial_check_status`, `materials_reconciled`,
`labour_reconciled`, `documents_reconciled`, `fee_reconciled`,
`client_funds_reconciled`, plus the actual figures, not just booleans) and
mint a document number the same way Funding Requests do. No separate "Run
Report" action — closing the stage *is* issuing the report, matching how
Issuing a Funding Request *is* freezing its snapshot.

**Stages closed before this ships have no report.** No backfill migration
recomputes historical snapshots retroactively (Phase 3's Slice 3.4/3.5 never
stored the inputs needed to reconstruct one faithfully as of the historical
close date). The Stage detail page shows "Report not available — this stage
was closed before this feature existed" for any stage with
`closed_on < feature-ship-date` and no snapshot row.

### Consequences for the spec

- New migration: either a `stage_closeouts` table finally built per §50
  (snapshot + metadata) or a `document_snapshot`-style JSON column added
  directly to `stages` — build-time DDL choice, not decided here; either
  way `closeStage` gains a write, not a new user-facing action.
- `web/src/lib/data/documents.ts` gains a fourth `DocumentInput` variant and
  `web/src/lib/documents/templates/render-html` gains a fourth template.
- No change to Phase 3's four hard gates or the Close Stage button's
  existing behavior — this only adds a write to the same transaction.
