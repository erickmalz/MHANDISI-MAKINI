import "server-only";

import {
  availableFloat,
  feeOutstanding,
  forecastFundingRequirement,
} from "@/lib/finance";
import type { ProjectAlert, Stage } from "@/lib/types";

/**
 * `Project.alerts` is a **computed view**, not a stored table (multi-tenancy
 * ticket 08 §4). This is the v1 rule set, derived from the current stage's
 * projected figures; it grows as the money and procurement records land in
 * later slices (overdue funding request, delivered-but-unpaid PO, missing
 * delivery note, …).
 */
export function deriveProjectAlerts(currentStage: Stage | undefined): ProjectAlert[] {
  if (!currentStage) return [];

  const f = currentStage.financials;
  const alerts: ProjectAlert[] = [];
  const float = availableFloat(f);
  const ffr = forecastFundingRequirement(f);

  if (float < 0) {
    alerts.push({
      id: "float-negative",
      severity: "critical",
      message:
        "Available Float is negative — supervisor funds are temporarily financing this project.",
    });
  }

  if (f.fundingRequestPending) {
    alerts.push({
      id: "funding-request-pending",
      severity: "info",
      message: `Funding request issued for ${currentStage.name} — awaiting the client's deposit.`,
    });
  } else if (ffr > 0) {
    alerts.push({
      id: "additional-funding-required",
      severity: "warning",
      message: `${currentStage.name} is underfunded — an additional funding request is needed.`,
    });
  }

  if (feeOutstanding(f) > 0) {
    alerts.push({
      id: "fee-outstanding",
      severity: "info",
      message: "A Fee Invoice for this stage is issued and not yet paid.",
    });
  }

  return alerts;
}
