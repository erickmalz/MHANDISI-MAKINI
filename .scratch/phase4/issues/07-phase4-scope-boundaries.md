# Phase 4 scope boundaries

Type: grilling
Status: resolved

## Question

Two loose ends need closing before this map can call itself complete.
First: is Phase 4 (guidelines §60) the end of the roadmap, or does
something remain after it? Second: Operational Control decision 5
(`.scratch/operational-control/map.md`) explicitly deferred Supplier/
Subcontractor Statement PDF/JPG export as "a deferred fast-follow (would
reuse ticket 10's rendering module once there's real demand for it), not
part of this slice" — an open thread with no owning ticket since. Does
Phase 4 pick it up?

## Answer

**Phase 4 is the final roadmap phase.** Guidelines §57–§60 enumerate
Phases 1–4 as "Recommended MVP"; §61 ("Explicit Non-Goals for Initial
Product") is a permanent exclusion list, not a Phase 5 — client/
subcontractor/supplier login, multi-user permissions, Gantt/critical-path
scheduling, payroll, full accounting/GL/tax, warehouse ERP, heavy QA/
snagging/safety systems, BIM, drawing revision management, multi-currency-
per-project, full offline sync. Nothing in the guidelines doc names
anything beyond §60. Once this map's six tickets are built, the guidelines
doc's full recommended feature set is delivered.

**The Statement PDF/JPG thread closes permanently, not just stays
deferred.** Ticket 06 above classified every report (including Supplier/
Subcontractor Statements) as the "live view" document class specifically
*because* a Statement is "always a live, current view... across every
project the party is used on" (Operational Control decision 5's own
words) — which cannot be frozen into a single point-in-time snapshot the
way an issued document can without changing what a Statement fundamentally
is. Freezing one would mean either building a second, different "Statement
as of {date}" feature (not what was asked for) or silently mislabeling a
live view as an issued record. Recorded here as a closed decision: **no
PDF/JPG export for Statements, ever, under the current Statement design** —
not an open item any future map should keep re-surfacing.

### Consequences for the spec

- No further roadmap phase exists beyond this map's six tickets (01–06);
  a future feature request outside §57–§61 is new product scope, not a
  gap in this plan.
- Operational Control decision 5's "fast-follow" language is superseded —
  `.scratch/operational-control/map.md` is not edited (it's a resolved,
  historical record), but this ticket is the authoritative closure of that
  thread going forward.
- This map, once all seven tickets are resolved, is the complete
  build-ready spec for Phase 4 — same discipline as
  `.scratch/phase1-decisions/`, `.scratch/multi-tenancy/`,
  `.scratch/operational-control/`, and `.scratch/phase3/`.
