# Labour Retention Policy

Type: grilling
Status: resolved

## Question

Is labour retention used at all in the supervisor's real subcontractor agreements? If yes: what percentage (is it fixed or does it vary per subcontractor/task), what condition releases it (e.g. defect-free period, final task sign-off), and is there a typical release date/duration?

This determines whether the Retention fields on Labour Agreements (§27) and the Outstanding Labour formula (§6.3) are active for Phase 1 or can be left unused.

## Decision

1. **Retention is not used** in the supervisor's real subcontractor agreements — the full agreed labour amount is paid out as work completes, with the Final payment type (§28) settling on completion rather than a later retention release.
2. **Phase 1 keeps the retention machinery dormant, not removed**: §27's Retention percentage field, §28's Retention Release payment type, and §6.3's retention term in the Outstanding Labour formula all stay in the data model, defaulting to unused/0% — available if a future subcontractor ever negotiates retention, without needing to re-add the feature later.
