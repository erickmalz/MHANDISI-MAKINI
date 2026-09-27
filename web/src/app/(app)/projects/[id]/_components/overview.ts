/**
 * Pure helpers behind the project Overview: what the status sentence says and
 * the order the alerts are listed in. Everything is derived from
 * `StageFinancials` and `ProjectAlert` through the single calculation path in
 * `@/lib/finance` — nothing here invents a figure.
 */
import {
  HEALTH_BUFFER,
  availableFloat,
  forecastFundingRequirement,
  formatTZS,
} from "@/lib/finance";
import type { Translator } from "@/lib/i18n/translate";
import type {
  AlertSeverity,
  FinancialHealth,
  ProjectAlert,
  StageFinancials,
} from "@/lib/types";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Most urgent first; alerts of equal severity keep their original order. */
export function sortAlertsBySeverity(alerts: ProjectAlert[]): ProjectAlert[] {
  return alerts
    .map((alert, index) => ({ alert, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.alert.severity] - SEVERITY_RANK[b.alert.severity] ||
        a.index - b.index,
    )
    .map(({ alert }) => alert);
}

/**
 * One plain sentence about where the stage's funding stands. It states what is
 * true and, where the numbers show a gap, how big it is. The wording comes from
 * the catalogue (`overview.status.sentence.*`), so it reads in the reader's
 * language; the figures are formatted here.
 */
export function statusSentence(
  f: StageFinancials,
  health: FinancialHealth,
  t: Translator,
): string {
  const float = availableFloat(f);
  const requirement = forecastFundingRequirement(f);
  const margin = Math.round((HEALTH_BUFFER - 1) * 100);

  switch (health) {
    case "blue":
      return requirement > 0
        ? t("overview.status.sentence.pendingShortfall", { amount: formatTZS(requirement) })
        : t("overview.status.sentence.pending");
    case "red":
      return float < 0
        ? t("overview.status.sentence.overCommitted", { amount: formatTZS(-float) })
        : t("overview.status.sentence.underfunded", { amount: formatTZS(requirement) });
    case "amber":
      return t("overview.status.sentence.tight", { margin });
    case "green":
      return t("overview.status.sentence.comfortable", { margin });
  }
}
