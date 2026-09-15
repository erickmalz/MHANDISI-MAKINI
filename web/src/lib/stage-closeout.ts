/**
 * Pure Stage Closeout view-model (Phase 3 ticket 05) — no data access, safe to
 * import from a client component. Mirrors `src/lib/variations.ts` /
 * `src/lib/procurement.ts`: the DAL (`src/lib/data/stage-closeout.ts`) reads
 * the raw rows, this module turns them into the checklist's four hard gates
 * plus a `canClose` verdict. There is no new "checklist" table — this is
 * exactly the computed-view pattern `StageFinancials` already uses.
 *
 * Ticket 05 §1: only these four checks block `Close Stage`. Everything else
 * (deliveries, surplus, deposits, fee outstanding, attachments, retention) is
 * informational and never gates — the closeout screen renders that directly
 * from `StageFinancials` / stock balances without going through this module.
 */

export type StageCloseoutTaskRef = { id: string; seq: number; description: string };
export type StageCloseoutVariationRef = {
  id: string;
  displayNumber: string | null;
  status: string;
  description: string;
};
export type StageCloseoutPORef = { id: string; displayNumber: string | null };

export interface StageCloseoutGates {
  openTasks: StageCloseoutTaskRef[];
  nonTerminalVariations: StageCloseoutVariationRef[];
  orderedPurchaseOrders: StageCloseoutPORef[];
  openLabourCommitments: number;
}

export interface StageCloseoutBlocker {
  key: "open-task" | "non-terminal-variation" | "ordered-purchase-order" | "open-labour-commitments";
  label: string;
}

/** The Stage statuses `Close Stage` is available from (ticket 05 §2). */
export const CLOSEABLE_STAGE_STATUSES = new Set(["active", "ready_for_closeout"]);

/**
 * The four hard-blocking checks (ticket 05 §1), evaluated in order. Every
 * task's status must be terminal (`completed`/`cancelled`); every Variation
 * must be terminal (`rejected`/`cancelled` — `draft`/`approved` both block,
 * per the actual 4-value `variation_status` enum ticket 01 shipped, which
 * collapsed the ticket's own prose list of five non-terminal names); no
 * Purchase Order left `ordered`; zero Open Labour Commitments.
 */
export function stageCloseoutBlockers(gates: StageCloseoutGates): StageCloseoutBlocker[] {
  const blockers: StageCloseoutBlocker[] = [];
  if (gates.openTasks.length > 0) {
    blockers.push({
      key: "open-task",
      label: `${gates.openTasks.length} task${gates.openTasks.length === 1 ? "" : "s"} still open`,
    });
  }
  if (gates.nonTerminalVariations.length > 0) {
    blockers.push({
      key: "non-terminal-variation",
      label: `${gates.nonTerminalVariations.length} variation${
        gates.nonTerminalVariations.length === 1 ? "" : "s"
      } not yet resolved`,
    });
  }
  if (gates.orderedPurchaseOrders.length > 0) {
    blockers.push({
      key: "ordered-purchase-order",
      label: `${gates.orderedPurchaseOrders.length} purchase order${
        gates.orderedPurchaseOrders.length === 1 ? "" : "s"
      } still ordered`,
    });
  }
  if (gates.openLabourCommitments > 0) {
    blockers.push({
      key: "open-labour-commitments",
      label: "Labour agreements not fully paid",
    });
  }
  return blockers;
}

/** Whether `Close Stage` is available: the right starting status, and all four gates clear. */
export function canCloseStage(status: string, gates: StageCloseoutGates): boolean {
  return CLOSEABLE_STAGE_STATUSES.has(status) && stageCloseoutBlockers(gates).length === 0;
}

/**
 * The Client Funds group's "Stage surplus/shortfall identified" line (ticket
 * 05 §1) is `@/lib/finance`'s existing `forecastFundingRequirement` — no new
 * formula: positive = a shortfall (Additional Funding Required), zero or
 * negative = a surplus (Current Funding Adequate). It is shown with emphasis
 * when positive but never blocks, per ticket 05's own reasoning (the Engineer
 * may already be mid-way through raising an Additional Funding Request).
 */
