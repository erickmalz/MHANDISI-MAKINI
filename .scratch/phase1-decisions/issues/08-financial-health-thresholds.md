# Financial Health Indicator Thresholds

Type: grilling
Status: resolved

## Question

The Financial Health Indicator (§8: Green/Amber/Red/Blue) needs concrete thresholds instead of "configurable later." Given how the supervisor actually judges a project's risk day to day across the 3 real projects: what float-vs-upcoming-commitments ratio (or other rule) should count as Green (comfortable), Amber (tight), and Red (underfunded/negative)? Is a single global threshold acceptable, or does it need to vary per project (e.g. by project size)?

## Answer

1. **Reuse the existing Forecast Funding Requirement (§9) rather than inventing a second "is there enough money" calculation.** Define **Remaining Stage Requirement (RSR)** = Remaining Material + Remaining Labour + Remaining Fee + Approved Other Commitments (the positive terms of §9's formula). Forecast Funding Requirement (FFR) = RSR − Available Float, exactly as already defined.

2. **Red**: Available Float < 0, **or** FFR > 0 (i.e. §9 already says "Additional Funding Required" — what's left to spend in the stage exceeds what's currently available).

3. **Green**: Available Float ≥ RSR × 1.20 — float covers everything remaining in the stage with at least a 20% buffer.

4. **Amber**: everything in between — Available Float ≥ 0 and Available Float < RSR × 1.20 (funding is technically adequate per §9, i.e. FFR ≤ 0, but with less than a 20% buffer).

5. **The 20% buffer is a single global constant for Phase 1**, not per-project. It can become a per-project setting later if real experience across projects shows a genuine need for different risk tolerances, but Phase 1 keeps it simple and consistent with how most other decisions on this map were kept global rather than configurable.

6. **Blue is unchanged and takes priority over the above while it applies**: a stage with an issued Funding Request awaiting client deposit shows Blue regardless of what Green/Amber/Red would otherwise compute to, per §8's existing definition — not re-litigated here.

7. **Edge case**: when RSR = 0 (nothing left to spend in the stage, e.g. near stage completion), Green triggers as long as Available Float isn't negative — there's no remaining requirement to buffer against.

### Rationale

Reusing §9 instead of a separate "upcoming N days" window avoids maintaining two different insufficient-funds calculations that could disagree with each other on the same dashboard. A percentage-of-remaining-requirement buffer (rather than a flat TZS amount) scales naturally across the supervisor's 3 real projects of differing size without needing a per-project override in Phase 1.

### Consequences for the spec (mechanical fallout)

- §8 Financial Health Indicators gains a precise Green/Amber/Red rule as above; Blue's existing definition is unchanged.
- A new derived constant, the 20% buffer, is a single global setting (not stored per-project) — candidate for §51 Derived Financial Views alongside the other calculated positions.
- No new fields or tables — RSR and FFR are already fully defined by §9; Green/Amber/Red is purely a display-layer classification of existing numbers.

---

**This was the last open ticket on this map. All 9 tickets (01–09) are now resolved — the destination (a build-ready decision set unblocking Phase 1) has been reached.**
