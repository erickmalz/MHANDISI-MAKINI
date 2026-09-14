# Phase 3 scope boundaries

Type: grilling
Status: resolved

## Question

Guidelines §59 lists seven Phase 3 items. Item 4, "Funding-request versions,"
sounds like it could already be satisfied by Slice 2.5's Draft→Issued→
Superseded state machine, built and CI-verified in Phase 2 — but that needs
confirming rather than assuming, since a false "already done" would silently
drop real Phase 3 scope. Separately, §37 (Project Closeout) and §60 (Phase 4 —
Site History & Reporting: site diary, progress-photo timeline, **stage
closeout reports**, project closeout, comprehensive activity history,
advanced reporting dashboard) sit close enough to this map's ticket 05 (Stage
Closeout workflow) and ticket 04 (Financial Reconciliation Engine) that their
boundary needs to be drawn explicitly, or those tickets risk quietly
absorbing Phase 4 work. Resolve both: is there any remaining Phase 3 work
under item 4, and exactly where does the Phase 3 / Phase 4 line fall.

## Answer

1. **Funding-request versions (§59 item 4) is fully satisfied by Slice 2.5 —
   no Phase 3 ticket needed.** The slice-2.5 runbook and `phase2/status.md`
   show the complete machine already built and CI-green (run `34360555087`):
   Draft → Issued (atomic transaction, freezes `document_snapshot`, mints
   `FR-{project}-NNN`), `supersedeFundingRequest` forking a Draft `v+1` with
   the predecessor moving to `superseded` only once the fork itself Issues,
   the Fee Invoice reissue-vs-delta rule on supersede, and a separate
   Additional Funding Request path that never versions the original
   (multi-tenancy ticket 09 §1, carried through unchanged). Nothing in the
   guidelines doc's treatment of Funding Request versions (§18, §56, `Funding
   Request` / `Additional Funding Request` in `CONTEXT.md`) describes any
   behavior beyond what's built. The only place versions interact with new
   Phase 3 ground is as a **consumer**: ticket 01 (Variation module) decides
   whether an Approved Variation drives a **new** Additional Funding Request
   or a **superseding version** of the current one — that is ticket 01's
   decision to make using the existing machine as-is, not a reason to reopen
   this item. **This map records no ticket 04-of-the-guidelines-numbering**
   (it would have duplicated the map's own ticket 01) and needs no new
   `.scratch/phase3/issues/` file for it.

2. **The Phase 3 / Phase 4 line, drawn explicitly:**
   - **In scope for this map (Phase 3, "Change & Forecast Control")**: a
     Variation module and its financial application (ticket 01); proactively
     surfacing the Forecast Funding Requirement and shortfall warnings
     (ticket 02); a Budget Variance Analysis view (ticket 03); the Financial
     Reconciliation Engine's **checks and score** (ticket 04); the Stage
     Closeout **workflow** — the checklist gate and the state transition it
     performs on one stage (ticket 05); the Material Stock ledger and Surplus
     Material handling that Stage Closeout needs to actually carry material
     forward or write it off (ticket 06).
   - **Out of scope, deferred to a future Phase 4 map (guidelines §60)**:
     Site Diary, Progress-Photo Timeline, **Stage Closeout Reports**, Project
     Closeout (§37), Comprehensive Activity History, and the Advanced
     Reporting Dashboard. This mirrors the precedent already set by
     `.scratch/multi-tenancy/map.md`, which explicitly put Site Diary and
     Progress Photos out of scope as "the doc's own Phase 4" when resolving
     its ticket 01 — the same reasoning applies here one phase later.
   - **The specific Stage Closeout boundary** (relevant to ticket 05, running
     in parallel): *performing* a closeout — running the checklist, gating on
     it, transitioning the stage to Closed, and taking the four optional
     post-closeout actions the guidelines list (Create Next Stage / Create
     Next Stage Funding Request / Carry Forward Surplus Materials / Carry
     Forward Client Float) — is Phase 3. *Producing a formal, shareable
     closeout report document* (guidelines §60 item 3, alongside the existing
     Issued Document family from ticket 10 of the multi-tenancy map) is Phase
     4. Ticket 05 should design the checklist and the state change; it should
     **not** design a rendered report artifact — that waits for Phase 4 to
     decide its shape against whatever data Phase 3 actually recorded.
   - **The Financial Reconciliation Engine boundary** (relevant to ticket 04):
     "Run Financial Check" producing a live Reconciliation Score and a list of
     warnings/critical issues **on demand, in the UI**, is Phase 3. Any
     *historical* record of past reconciliation runs, or folding reconciliation
     results into the Phase 4 "Advanced Reporting Dashboard," is out of scope
     here.

3. **Project Closeout (§37) needs nothing from this map — no schema, no
   ticket, no forward-compatibility hook.** It aggregates figures (total
   funding, total commitments, supplier/subcontractor balances, final
   variance) that are all already derivable from records Phase 1/2/Operational
   Control already store, plus whatever Stage Closeout itself finalizes in
   Phase 3. There is no reason to pre-design a `project_status = completed`
   transition or a project-level closeout table now; a future Phase 4 map
   decides Project Closeout's shape once it can see the actual Stage Closeout
   data shape ticket 05 produces. Designing it speculatively here would risk
   guessing wrong and constraining ticket 05 for no present benefit.

### Consequences for the spec

- No new issue file is needed for guidelines §59 item 4 beyond this note —
  the map's ticket list (01–06 plus this scoping ticket 07) is the complete
  Phase 3 decision set.
- Ticket 05 (Stage Closeout workflow) is bounded to the checklist + state
  transition + the four listed post-closeout actions; it must not design a
  rendered closeout report.
- Ticket 04 (Financial Reconciliation Engine) is bounded to the live
  on-demand check + score; no historical-run storage, no reporting-dashboard
  integration.
- Ticket 06 (Material Stock ledger) is the one piece of Phase-1-committed-but-
  unbuilt scope (`.scratch/phase1-decisions/issues/06-surplus-material-handling.md`)
  that Stage Closeout depends on to actually execute Carried Forward / Written
  Off — it is in scope precisely because ticket 05 cannot close a stage
  without it, not because guidelines §59 names it directly.
- Project Closeout (§37) and all of guidelines §60 are recorded as out of
  scope on `map.md`, alongside the existing multi-tenancy precedent.
