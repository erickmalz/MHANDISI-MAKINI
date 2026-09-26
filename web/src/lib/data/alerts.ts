import "server-only";

import { sql } from "drizzle-orm";

import {
  availableFloat,
  feeOutstanding,
  forecastFundingRequirement,
} from "@/lib/finance";
import type { ProjectAlert, Stage } from "@/lib/types";

import type { AccountTx } from "./with-account";

/**
 * `Project.alerts` is a **computed view**, not a stored table (multi-tenancy
 * ticket 08 §4). Two tiers, both scoped to the project's *current* stage only
 * (matching the "one project, one stage at a time" UX everywhere else):
 *
 * - `deriveProjectAlerts` — pure, arithmetic-only alerts computable from the
 *   `Stage` view-model that already exists on every screen (§33's remaining
 *   Financial alerts).
 * - `computeStageAlerts` — everything else (§33's Procurement + Labour
 *   alerts), which needs per-record detail (a specific overdue PO, a specific
 *   task over its labour agreement) that the `StageFinancials` aggregate
 *   doesn't carry. Runs its own targeted queries inside the caller's
 *   `withAccount` transaction, same pattern as `./stage-financials.ts`.
 *
 * "Missing receipt" / "missing delivery note" (§33) both key off whether a
 * Purchase Order has an attachment (Operational Control decision 1) — with
 * one attachment slot per PO rather than per delivery/payment, the two
 * collapse to the same underlying signal, worded by whichever milestone
 * (delivered vs delivered-and-paid) was actually reached.
 *
 * Deferred to Phase 3 (`.scratch/operational-control/map.md`): every Control
 * Alert (variations, closeout, reconciliation don't exist yet) and "cost
 * variance above threshold" (needs Budget Revisions' "revised" values to be
 * meaningful).
 */

/** The purely arithmetic alerts — no query, just the already-projected figures. */
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

  // Float can be positive and still not cover what's already been ordered /
  // agreed but not yet paid — a distinct warning from "additional funding
  // required" (which looks at the *scoped* remaining requirement, not what's
  // already committed).
  const upcomingCommitments = f.openPurchaseCommitments + f.openLabourCommitments;
  if (float >= 0 && float < upcomingCommitments) {
    alerts.push({
      id: "float-below-upcoming-commitments",
      severity: "warning",
      message: `Available Float (${formatShort(float)}) is below open commitments (${formatShort(upcomingCommitments)}) still to be paid.`,
    });
  }

  if (currentStage.status === "Completed" && f.openLabourCommitments > 0) {
    alerts.push({
      id: "stage-complete-labour-outstanding",
      severity: "warning",
      message: `${currentStage.name} is marked complete but has unpaid labour commitments outstanding.`,
    });
  }

  return alerts;
}

function formatShort(amount: number): string {
  return `TZS ${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * The query-based alerts — Procurement + Labour, plus the one Financial
 * alert ("unallocated deposit") that needs the raw funding-request/deposit
 * rows rather than the net `StageFinancials` figures. `projectId` is only
 * used to build each alert's `href`.
 */
export async function computeStageAlerts(
  tx: AccountTx,
  projectId: string,
  stageId: string,
): Promise<ProjectAlert[]> {
  const alerts: ProjectAlert[] = [];

  // --- Procurement: material lines exist but no PO has been raised at all
  //     for the stage yet. There is no FK between a Material Line and a
  //     Purchase Order line (they're independently entered), so this is
  //     deliberately a coarse, stage-level signal ("you've estimated
  //     materials but haven't ordered anything"), not a per-item match. ------
  const [coverage] = (
    await tx.execute<{ has_material_lines: boolean; has_purchase_orders: boolean }>(sql`
      SELECT
        EXISTS(
          SELECT 1 FROM material_lines ml
          JOIN tasks t ON t.id = ml.task_id
          WHERE t.stage_id = ${stageId}
        ) AS has_material_lines,
        EXISTS(SELECT 1 FROM purchase_orders WHERE stage_id = ${stageId}) AS has_purchase_orders
    `)
  ).rows;
  if (coverage?.has_material_lines && !coverage.has_purchase_orders) {
    alerts.push({
      id: "material-not-ordered",
      severity: "warning",
      message: "Material take-off lines exist for this stage but no Purchase Order has been raised yet.",
      href: `/projects/${projectId}/procurement/new`,
    });
  }

  // --- Procurement: per-`ordered` PO, roll up ordered/delivered/paid to spot
  //     overdue, partial delivery, and delivered-but-unpaid ("supplier
  //     invoice unpaid" — there is no separate invoice record in v1, so a
  //     fully-delivered PO short of its ordered total paid is the proxy). ---
  const poRows = (
    await tx.execute<{
      id: string;
      display_number: string | null;
      expected_delivery_on: string | null;
      ordered_total: string;
      qty_ordered_total: string;
      qty_delivered_total: string;
      paid_total: string;
      has_attachment: boolean;
    }>(sql`
      SELECT
        po.id,
        po.display_number,
        po.expected_delivery_on,
        COALESCE((SELECT SUM(l.qty_ordered * l.unit_price) FROM purchase_order_lines l
                   WHERE l.purchase_order_id = po.id), 0) AS ordered_total,
        COALESCE((SELECT SUM(l.qty_ordered) FROM purchase_order_lines l
                   WHERE l.purchase_order_id = po.id), 0) AS qty_ordered_total,
        COALESCE((SELECT SUM(drl.qty_delivered)
                    FROM delivery_record_lines drl
                    JOIN delivery_records dr ON dr.id = drl.delivery_record_id
                    JOIN purchase_order_lines pol ON pol.id = drl.purchase_order_line_id
                   WHERE pol.purchase_order_id = po.id AND dr.voided_at IS NULL), 0) AS qty_delivered_total,
        COALESCE((SELECT SUM(p.amount) FROM payment_records p
                   WHERE p.purchase_order_id = po.id AND p.voided_at IS NULL), 0) AS paid_total,
        EXISTS(SELECT 1 FROM attachments a WHERE a.purchase_order_id = po.id) AS has_attachment
      FROM purchase_orders po
      WHERE po.stage_id = ${stageId} AND po.status = 'ordered'
    `)
  ).rows;

  const today = new Date().toISOString().slice(0, 10);
  for (const po of poRows) {
    const label = po.display_number ?? "this Purchase Order";
    const href = `/projects/${projectId}/procurement/${po.id}`;
    const qtyOrdered = Number(po.qty_ordered_total);
    const qtyDelivered = Number(po.qty_delivered_total);
    const orderedTotal = Number(po.ordered_total);
    const paidTotal = Number(po.paid_total);
    const fullyDelivered = qtyDelivered >= qtyOrdered;

    if (po.expected_delivery_on && po.expected_delivery_on < today && !fullyDelivered) {
      alerts.push({
        id: `po-overdue-${po.id}`,
        severity: "warning",
        message: `${label} was expected by ${po.expected_delivery_on} and is not fully delivered.`,
        href,
      });
    } else if (qtyDelivered > 0 && !fullyDelivered) {
      alerts.push({
        id: `po-partial-delivery-${po.id}`,
        severity: "info",
        message: `${label} has an outstanding partial delivery.`,
        href,
      });
    }

    if (fullyDelivered && paidTotal < orderedTotal) {
      alerts.push({
        id: `po-unpaid-${po.id}`,
        severity: "warning",
        message: `${label} is fully delivered but not fully paid.`,
        href,
      });
    }

    // "Missing delivery note" / "missing receipt" (§33) — one attachment
    // slot per PO (decision 1), not one per delivery/payment, so both
    // collapse to the same underlying signal: nothing has been attached yet,
    // worded by whichever milestone was actually reached.
    if (!po.has_attachment) {
      if (fullyDelivered && paidTotal >= orderedTotal) {
        alerts.push({
          id: `po-missing-receipt-${po.id}`,
          severity: "info",
          message: `${label} is fully delivered and paid but has no receipt or invoice attached.`,
          href,
        });
      } else if (fullyDelivered) {
        alerts.push({
          id: `po-missing-delivery-note-${po.id}`,
          severity: "info",
          message: `${label} is fully delivered but has no delivery note attached.`,
          href,
        });
      }
    }
  }

  // --- Labour: per Task with a labour agreement, compare payments to the
  //     agreement. "Final payment on an incomplete task" has no dedicated
  //     flag in v1 (labour_payments carries no "is this the final one" bit)
  //     — the proxy is payments reaching the full agreement while the task
  //     itself isn't marked complete. ------------------------------------
  const taskRows = (
    await tx.execute<{
      id: string;
      description: string;
      status: string;
      agreement: string;
      paid: string;
    }>(sql`
      SELECT
        t.id,
        t.description,
        t.status,
        COALESCE(t.labour_revised, t.labour_original, 0) AS agreement,
        COALESCE((SELECT SUM(lp.amount) FROM labour_payments lp
                   WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid
      FROM tasks t
      WHERE t.stage_id = ${stageId}
        AND (t.labour_original IS NOT NULL OR t.labour_revised IS NOT NULL)
    `)
  ).rows;

  for (const task of taskRows) {
    const href = `/projects/${projectId}/tasks/${task.id}/edit`;
    const agreement = Number(task.agreement);
    const paid = Number(task.paid);
    if (agreement <= 0) continue;

    if (paid > agreement) {
      alerts.push({
        id: `labour-exceeds-agreement-${task.id}`,
        severity: "critical",
        message: `Labour payments for "${task.description}" exceed its agreed amount.`,
        href,
      });
    } else if (
      paid >= agreement &&
      task.status !== "completed" &&
      task.status !== "cancelled"
    ) {
      alerts.push({
        id: `labour-final-payment-incomplete-${task.id}`,
        severity: "warning",
        message: `"${task.description}" has been paid in full but is not marked complete.`,
        href,
      });
    }
  }

  // --- Financial: deposits recorded against the stage's live Funding
  //     Requests exceed what those requests actually asked for. -------------
  const [depositRow] = (
    await tx.execute<{ requested_total: string; deposited_total: string }>(sql`
      SELECT
        (SELECT COALESCE(SUM(frl.amount), 0) FROM funding_request_lines frl
          WHERE frl.funding_request_id IN (
            SELECT id FROM funding_requests WHERE stage_id = ${stageId} AND status IN ('issued', 'closed')
          )) AS requested_total,
        (SELECT COALESCE(SUM(d.amount), 0) FROM deposits d
           JOIN funding_requests fr ON fr.id = d.funding_request_id
          WHERE fr.stage_id = ${stageId} AND d.voided_at IS NULL) AS deposited_total
    `)
  ).rows;
  const requestedTotal = Number(depositRow?.requested_total ?? 0);
  const depositedTotal = Number(depositRow?.deposited_total ?? 0);
  if (requestedTotal > 0 && depositedTotal > requestedTotal) {
    alerts.push({
      id: "unallocated-deposit",
      severity: "info",
      message: `Deposits received (${formatShort(depositedTotal)}) exceed the amount requested (${formatShort(requestedTotal)}) — the difference is unallocated.`,
    });
  }

  return alerts;
}
