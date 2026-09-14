# Phase 3 — build status

Decisions: `.scratch/phase3/map.md` (7 tickets, all resolved). Same
environment constraint as Phase 2 / Operational Control
(`.scratch/phase2/status.md`): `web/node_modules` is Windows-built, so only
`tsc`/`eslint` run in WSL — `db:migrate`, `npm test`, `npm run build`
verification goes through CI's own throwaway Postgres. Land and verify each
migration before building the DAL on top of it.

_Not started. This is a proposed slice order derived from the seven tickets'
own cross-dependency flags (map.md's "Decisions so far" / "Not yet
specified"), written so a build session can pick it up without re-deriving
the sequencing._

## Why this order

Tickets 02 (forecast/warnings) and 07 (scope boundaries) need no build at
all — 02 is already fully delivered by Phase 1 + Operational Control, and 07
is a pure scope statement. The remaining five have a real dependency chain:
ticket 06's `carryForwardSurplus` write is called by ticket 05's Close Stage
action, so 06 must exist before 05 wires its button to it. Ticket 03
restructures the Material Take-Off form's write path (delete-and-reinsert →
true per-line updates, to support frozen `*_original` columns) before ticket
06 layers an "Apply from stock" input onto that same form — building them in
the other order would mean rewriting 06's UI once 03 lands. Ticket 01
(Variations) is independent of all of them and can be built first or in
parallel with 03. Ticket 04 (Reconciliation Engine) is last because two of
its checks explicitly reference ticket 01's status set and ticket 03's
variance figures (map.md's "Not yet specified"), and it aggregates the
Alerts feed that every other slice's data flows into.

## Slice ledger

| Slice | Scope | Status |
| --- | --- | --- |
| 3.1 | **Variation module** (ticket 01) — `variations` table + status enum (`draft/approved/rejected/cancelled`), `VO-{project_code}-NNN` numbering via `claimDocumentNumber`, Approve transaction (writes `tasks.labourRevised` in place, appends `material_lines` tagged `variation_id`, bypasses `stageBudgetLocked` as the sanctioned exception), `additional_funding_request_variations` join table, CRUD screens under the relevant Task/Stage detail pages. | **Done + verified** (commit `557f319` on `phase3-change-forecast-control`, migration `0008_variation_module` — CI run `34876962293` on PR #4 green: `lint` / `typecheck` / migrations / isolation suite / `build` all ✓). Runbook: `.scratch/phase3/slice-3.1-runbook.md`. |
| 3.2 | **Budget Variance Analysis** (ticket 03) — freeze `material_lines.*_original` at the same stage-lock trigger used for Task labour; switch take-off edits from delete-and-reinsert to true per-line updates (a dropped line reads `qty_revised = 0`); stage-level Total Estimated vs. `paidPurchases` reconciliation; combined Budget Variance card (material + existing labour variance) on the stage detail page. | Not started |
| 3.3 | **Material Stock ledger** (ticket 06) — append-only `material_stock_movements` table (`carried_forward \| drawn_into_takeoff \| written_off`), balance by `SUM`, keyed on normalised `lower(trim(item))+unit`; defines `carryForwardSurplus(tx, stageId, lines)` for 3.4 to call; "Apply from stock" input + item `<datalist>` autocomplete on the Material Take-Off form (built on 3.2's per-line-update path). No UI for Returned-to-Supplier / Transferred. | Not started |
| 3.4 | **Stage Closeout workflow** (ticket 05) — four hard-blocking gates (no open Task, no non-terminal Variation, no `ordered` PO, zero Open Labour Commitments); `Close Stage` sets `stages.status = 'completed'`; extends `stageBudgetLocked` with an OR on `completed`; wires the three real post-closeout buttons (Create Next Stage, Create Next Stage Funding Request, Carry Forward Surplus → calls 3.3's `carryForwardSurplus`) plus the "Carry Forward Client Float" no-op note; displays 3.2's variance card and 3.3's surplus figures read-only; always-present non-blocking "Retention: not used" line. | Not started |
| 3.5 | **Financial Reconciliation Engine** (ticket 04) — "Run Financial Check" on the stage detail page; folds in the existing `deriveProjectAlerts`/`computeStageAlerts` output; adds the 3 new checks (over-payment visibility, per-task unexplained labour balance on completed tasks, duplicate payment references); Reconciliation Score = `round(100 × (Passed + 0.5×Warnings)/(Passed+Warnings+Critical))`; folds in the two residual checks map.md flags as unowned (procurement-vs-requirement explanation, referencing 3.2's variance; unapproved/stale-Variation flag, referencing 3.1's status set) or explicitly marks them descoped in the runbook if they prove not worth it at build time. | Not started |

## Out of scope for this build

Guidelines §59 item 4 (Funding-request versions) — already delivered by
Slice 2.5, no Phase 3 work. Everything under guidelines §60 (Phase 4) — see
`map.md`'s "Out of scope".
