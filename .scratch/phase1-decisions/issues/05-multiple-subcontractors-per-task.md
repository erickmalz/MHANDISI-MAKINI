# Multiple Subcontractors per Task

Type: grilling
Status: resolved

## Question

The guidelines (§62.5) default to one task → one subcontractor. Does the supervisor's real practice across the 3 active projects ever need more than one subcontractor working the same task with separate payment ownership? If yes, the data model needs task work packages (a sub-division below Task) instead of a single `subcontractor_id` on Task (§50 `tasks` table) — if no, the existing default stands unchanged for Phase 1.

## Decision

1. **Single subcontractor per task stands unchanged for Phase 1.** No task work packages, no split payment ownership below Task level — Task keeps its single `Assigned subcontractor` field (§14, §50).
2. **Workaround for genuinely mixed-trade work**: if a piece of work naturally involves more than one trade (e.g. electrical + plumbing), the supervisor splits it into separate Tasks (one per subcontractor) rather than modeling it as one Task with multiple subcontractors — consistent with how Tasks already work as the unit-of-assignment.
