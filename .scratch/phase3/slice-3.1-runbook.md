# Slice 3.1 — Variation module — runbook

> **Verified 2026-09-14** — CI run `34876962293` on PR #4 green: `lint`,
> `typecheck`, migrations (incl. `0008`), the Testcontainers isolation suite
> and `npm run build` all ✓.

## What changed

Implements ticket 01 (`.scratch/phase3/issues/01-variation-module.md`) in
full, on the Phase 2 / Operational Control schema.

### Schema — migration `0008_variation_module`

- `document_number_type` (`src/lib/data/schema/enums.ts`) gains a third
  value, `"variation"`; `claimDocumentNumber`'s type union
  (`src/lib/data/document-numbers.ts`) extended to match.
- New `src/lib/data/schema/variations.ts` — `variation_status` enum
  (`draft | approved | rejected | cancelled`) and the `variations` table:
  `id`, `account_id`, `stage_id` + `task_id` (both composite-FK'd
  `(id, account_id)` → `stages`/`tasks`, `ON DELETE CASCADE`), `status`,
  `base_number` / `display_number` (nullable until Approve), `description`
  (required), `reason`, `material_impact` / `labour_impact` / `fee_impact`
  (signed `bigint`, nullable), `requested_at` (`timestamptz`,
  `default now()` — the "Requested date," never re-entered), `approved_at`
  (`date` — the client's real-world sign-off date, Engineer-entered, not a
  system clock), `client_reference`, `notes`, `rejected_at`, `cancelled_at`
  (both `timestamptz`). No `created_at`/`updated_at` — `requested_at` plays
  that role, matching the ticket's literal column list.
- `material_lines` gains a nullable `variation_id` uuid column,
  composite-FK'd to `variations (id, account_id)`, `ON DELETE NO ACTION`
  (same posture as `funding_requests.supersedes_id`'s self-reference — a
  Variation is never deleted, only cancelled, so this never fires in
  practice).
- New `src/lib/data/schema/additional-funding-request-variations.ts` — a
  plain 3-column join (`account_id`, `funding_request_id`, `variation_id`),
  no surrogate id or timestamps (same minimal shape as
  `document_number_sequences`), composite PK
  `(funding_request_id, variation_id)`, both FKs composite `(id, account_id)`
  → their parents, `ON DELETE CASCADE` on both (the link row has no life of
  its own once either parent is gone).

Generated via the isolated-Linux-drizzle-kit scratch procedure (throwaway
copy of `package.json` + `drizzle.config.ts` + `src/lib/data/schema/` +
`drizzle/` in a scratch dir, `npm install --ignore-scripts` there — full
`npm install` failed on `puppeteer`'s postinstall trying to download Chrome,
so scripts were skipped — then the real `npx drizzle-kit generate --name
variation_module`). Diffed `0007`'s snapshot against the generated `0008`
snapshot: the only differences are the two new tables, the new
`material_lines.variation_id` column + FK, and the extended
`document_number_type` enum — zero unintended drift. The RLS block
(`app.enable_standard_rls` on both new tables) was hand-appended to the
generated SQL, same pattern as every prior migration.

### DAL, validation, actions

- `src/lib/variations.ts` **(new)** — pure view-model: `VariationStatus`,
  `variationStatusLabel`, `LinkedFundingRequest`, `Variation`,
  `isVariationDraft`, `isVariationFunded` (the ticket's "Funded" derivation —
  never stored: an Approved Variation reads as funded once every linked
  request is not still a `draft`).
- `src/lib/validation/variations.ts` **(new)** — isomorphic Zod:
  `variationDraftSchema` (note: impacts are a **signed** whole-shilling
  amount — no `.nonnegative()` — unlike every other amount field in this
  codebase), `approveVariationSchema` (`approvedAt`/`clientReference`, both
  optional — neither gates Approve).
- `src/lib/data/variations.ts` **(new)** — `withAccount` + RLS, no
  `accountId` in any signature:
  - Read: `listVariationsForStage(stageId)`, `getVariation(variationId)` —
    both assemble the nested view-model incl. `fundingRequestLinks` from the
    join table.
  - Draft CRUD: `createVariationDraft(stageId, input)` (validates the chosen
    task belongs to the stage), `getVariationDraftInput`,
    `updateVariationDraft`, `deleteVariationDraft`.
  - **`approveVariation(variationId, input)`** — the atomic transaction:
    mints `VO-{project_code}-NNN`; if `labourImpact` is non-null/non-zero,
    a raw `UPDATE tasks SET labour_revised = COALESCE(labour_revised,
    labour_original, 0) + impact` (bypassing `stageBudgetLocked` — the one
    sanctioned caller); if `materialImpact` is non-null/non-zero, **appends
    one** `material_lines` row (`item = "Variation VO-…"`, `qty = 1`,
    `unit = "lot"`, `est_unit_cost_original = materialImpact`, tagged
    `variation_id`) — see "Deviations" below for why this is a single
    synthetic line rather than an itemised breakdown. Sets
    `approved_at`/`client_reference`.
  - `rejectVariation` (draft → rejected, never numbered),
    `cancelVariation` (draft or approved → cancelled).
  - `linkVariationsToFundingRequest(fundingRequestId, variationIds)` — the
    §4 join-table write; only links Variations that are actually `approved`,
    silently skips the rest.
  - `src/lib/data/index.ts` barrel extended with all of the above +
    `ApproveVariationResult`.
- `src/app/actions/variations.ts` **(new)** — `createVariationAction`,
  `updateVariationAction`, `deleteVariationDraftAction`,
  `approveVariationAction`, `rejectVariationAction`, `cancelVariationAction`.
  Same idiom as `actions/tasks.ts` / `actions/funding.ts`: ids as bound
  args, `revalidatePath` + `redirect`.
- `src/app/actions/funding.ts` — **extended, not rewritten**:
  `createFundingRequestAction` now also reads an optional hidden
  `variationIds` JSON field and, for an `additional`-kind request, calls
  `linkVariationsToFundingRequest` after the draft saves. The AFR state
  machine itself (Draft→Issued, Fee Invoice raising, etc.) is completely
  untouched, per the ticket's "reuse as-is" instruction.

### Screens

- `src/app/(app)/projects/[id]/stages/[stageId]/page.tsx` — new
  "Variations" section below the Tasks list (mirrors the Task list pattern
  per the map's UI note), each row linking to the Variation detail page; a
  "Raise variation" button (hidden when the stage has no tasks yet).
- `src/app/(app)/projects/[id]/stages/[stageId]/variations/new/page.tsx`
  **(new)** — create form; task picker from the stage's tasks.
- `src/app/(app)/projects/[id]/variations/[variationId]/page.tsx` **(new)**
  + `_components/VariationDetail.tsx` **(new, client)** — full detail: fields,
  impacts, dates, linked AFRs; Draft shows Edit/Discard + the Approve form
  (`approvedAt`/`clientReference`) + Reject/Cancel; Approved shows "Raise
  Additional Funding Request" (links to
  `/funding/new?kind=additional&variationId=…`) + Cancel.
- `src/app/(app)/projects/[id]/variations/[variationId]/edit/page.tsx`
  **(new)** — Draft-only edit.
- `src/app/(app)/projects/[id]/variations/_components/VariationStatusBadge.tsx`
  **(new)** — mirrors `FRStatusBadge`/`POStatusBadge`.
- `src/app/(app)/projects/_components/VariationForm.tsx` **(new)** — shared
  create/edit form.
- `src/app/(app)/projects/[id]/funding/new/page.tsx` +
  `_components/FundingRequestForm.tsx` — extended (not rewritten) to accept
  `?variationId=` query param(s), resolve the Approved Variation(s), show a
  "Raised for this Variation" note, default the stage picker to the
  Variation's stage, and post the link through as a hidden field.

## Deviations from the ticket's prose (for downstream slices 3.3/3.4/3.5)

- **Reject/Cancel carry no required reason field.** The ticket's own
  "Consequences for the spec" column list has no `reject_reason` /
  `cancel_reason` column (unlike Purchase Order's `cancel_reason`), so
  Reject/Cancel are implemented as plain state transitions + a timestamp,
  with no gating text field. This was a deliberate reading of the literal
  column list, not an oversight — flagged in case a downstream slice expects
  a stored reason.
- **Material impact → exactly one synthetic `material_lines` row**, not an
  itemised breakdown. The `variations` table carries a single signed
  `material_impact` figure (no per-item lines), so Approve inserts one row:
  `item = "Variation {display_number}"`, `description` = the Variation's
  `reason` (falling back to its `description`), `qty_original = 1`,
  `unit = "lot"`, `est_unit_cost_original = material_impact`. This is the
  only sensible reading of "appends new `material_lines` row(s)" given the
  table's actual shape — ticket 03 (Budget Variance) should treat any
  `material_lines` row with a non-null `variation_id` as reconciling against
  `material_impact`, not the normal estimate-vs-actual diff (map.md already
  flags this).
- **`approved_at` is a `date` column, not a `timestamptz`.** The ticket calls
  it "the client's real-world sign-off... Engineer-entered," which reads as
  a dated note (same idiom as Purchase Order's `supplier_ack_on`), not a
  system clock instant — so it's typed `date`, defaulting to today's date
  string in the DAL when left blank, never a JS `Date`.
- **No `updated_at` / plain `created_at` column on `variations`** —
  `requested_at` (`timestamptz`, `default now()`) does double duty as the
  creation timestamp, matching the ticket's literal column list exactly (it
  lists `requested_at` but no separate `created_at`).

Everything else matches ticket 01's decisions exactly — no other adaptation
was needed.

## Exact interface for downstream slices (3.3, 3.4, 3.5)

- **Table**: `variations` — columns `id, account_id, stage_id, task_id,
  status, base_number, display_number, description, reason,
  material_impact, labour_impact, fee_impact, requested_at, approved_at,
  client_reference, notes, rejected_at, cancelled_at`.
- **Enum**: `variation_status` = `'draft' | 'approved' | 'rejected' |
  'cancelled'` (stored TS type `VariationStatus` in `src/lib/variations.ts`).
- **Numbering**: minted only at Approve —
  `claimDocumentNumber(tx, accountId, projectId, "variation")` →
  `` `VO-${projectCode}-${pad3(base)}` ``. Never a `v{n}` suffix.
- **`material_lines.variation_id`** — nullable uuid, set only on a row an
  approved Variation appended; `NULL` for every ordinary take-off line.
- **Join table**: `additional_funding_request_variations` — columns
  `account_id, funding_request_id, variation_id`; composite PK
  `(funding_request_id, variation_id)`; no other columns. Written via
  `linkVariationsToFundingRequest(fundingRequestId, variationIds)` in
  `src/lib/data/variations.ts` — only rows for Variations actually
  `approved` are inserted.
- **`isVariationFunded(variation)`** (`src/lib/variations.ts`) is the one
  place "Funded" is computed — never stored.

## Verify

```bash
cd web
npm run typecheck   # clean in WSL
npm run lint        # clean in WSL
```

Migration `0008` generated + diffed via the isolated-Linux-drizzle-kit
procedure (see above) — zero unintended drift confirmed locally.
`db:migrate` / `npm test` / `npm run build` verified via CI run
`34876962293` on PR #4 (green: migrations incl. `0008` applied, `lint`,
`typecheck`, the isolation suite, and `build` all ✓).

## Report back

Commit `557f319` on `phase3-change-forecast-control`; PR #4
(`https://github.com/erickmalz/MHANDISI-MAKINI/pull/4`); CI run
`34876962293` green. Slice 3.1 is done; next is **Slice 3.2** (Budget
Variance Analysis, ticket 03).
