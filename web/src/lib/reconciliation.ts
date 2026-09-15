/**
 * Pure view model for the Financial Reconciliation Engine ("Run Financial
 * Check", guidelines §34; Phase 3 ticket 04,
 * `.scratch/phase3/issues/04-financial-reconciliation-engine.md`).
 *
 * No data access here — `src/lib/data/reconciliation.ts` builds the actual
 * `ReconciliationReport` (live, on demand, nothing stored) and this module
 * only holds the shared shapes and the score formula, so a screen or a test
 * can import either side independently (same split as
 * `src/lib/stage-closeout.ts` / `src/lib/data/stage-closeout.ts`).
 */

/** A finding's own severity, as recorded — independent of how its check rolls up. */
export type ReconciliationSeverity = "info" | "warning" | "critical";

/**
 * A check's overall rollup for the Passed/Warnings/Critical tally. An `info`
 * finding never costs a check its "passed" status (guidelines §34: the tool
 * is "informational, not an accounting certification") — it is still shown,
 * just folded into Passed for scoring.
 */
export type ReconciliationStatus = "passed" | "warning" | "critical";

export interface ReconciliationFinding {
  message: string;
  severity: ReconciliationSeverity;
  href?: string;
}

export interface ReconciliationCheck {
  key: string;
  /** The guideline check(s) this row answers, e.g. "guideline checks 1 & 15". */
  label: string;
  status: ReconciliationStatus;
  findings: ReconciliationFinding[];
}

export interface ReconciliationReport {
  stageId: string;
  stageName: string;
  passed: number;
  warnings: number;
  critical: number;
  /** `round(100 * (Passed + 0.5*Warnings) / (Passed+Warnings+Critical))`. */
  score: number;
  checks: ReconciliationCheck[];
}

/** Roll a check's findings up to one of the three tally buckets. */
export function reconciliationRowStatus(
  findings: ReconciliationFinding[],
): ReconciliationStatus {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  return "passed";
}

/**
 * The Reconciliation Score formula (ticket 04 §2) — reproduces the
 * guideline's own worked example (24 Passed, 2 Warnings, 0 Critical → 96%)
 * exactly: `(24 + 0.5*2) / 26 = 96.15...% → 96`. A stage with no checks at
 * all (shouldn't happen in practice — the alerts feed alone contributes over
 * a dozen rows) scores 100, not `NaN`.
 */
export function reconciliationScore(
  passed: number,
  warnings: number,
  critical: number,
): number {
  const total = passed + warnings + critical;
  if (total === 0) return 100;
  return Math.round((100 * (passed + 0.5 * warnings)) / total);
}
