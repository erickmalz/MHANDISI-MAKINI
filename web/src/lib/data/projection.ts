import "server-only";

import { sql } from "drizzle-orm";

import type { StageFinancials } from "@/lib/types";

import type { AccountTx } from "./with-account";

/**
 * The projection (multi-tenancy ticket 08 §1): build a stage's `StageFinancials`
 * by summing the atomic records — Deposits, Funding Request lines, Fee Invoices,
 * Purchase Orders (+ lines + payments), Labour Payments, Petty Cash Expenses,
 * Other Commitments — inside the caller's RLS transaction. There are **no
 * denormalised stage totals**; `finance.ts` then derives Available Float, the
 * Financial Health Indicator, etc. from this, unchanged.
 *
 * Money columns come back from `execute` as strings (bigint / numeric) — every
 * value is `Number()`-ed here. TZS amounts are whole numbers well inside the
 * safe integer range.
 *
 * `remainingOtherApproved` is 0 — see `.scratch/phase2/slice-2.2-runbook.md`.
 *
 * `materialEstimated` / `labourAgreementTotal` (Phase 3 ticket 03 — Budget
 * Variance Analysis) are additive: the stage-level Approved Estimate each
 * side of the variance reconciles against. `@/lib/finance`'s
 * `materialVariance`/`labourVariance`/`budgetVarianceTotal` derive the actual
 * variance figures from these plus the existing `paidPurchases`/
 * `labourPayments` — "one authoritative calculation path" (guidelines §51).
 */
export async function computeStageFinancials(
  tx: AccountTx,
  stageId: string,
): Promise<StageFinancials> {
  // --- Funding-request-scoped figures: deposits, the stage's scoped cost
  //     (live FR lines), fee invoiced / received, and the pending flag. -------
  const fundingRow = (
    await tx.execute<{
      client_deposits: string;
      fr_material: string;
      fr_labour: string;
      fr_fee: string;
      fr_fee_draft: string;
      fee_invoiced: string;
      fee_received: string;
      funding_request_pending: boolean;
    }>(sql`
      WITH live_fr AS (
        SELECT id FROM funding_requests
        WHERE stage_id = ${stageId} AND status IN ('issued', 'closed')
      )
      SELECT
        (SELECT COALESCE(SUM(d.amount), 0)
           FROM deposits d
           JOIN funding_requests fr ON fr.id = d.funding_request_id
          WHERE fr.stage_id = ${stageId} AND d.voided_at IS NULL) AS client_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM funding_request_lines
          WHERE funding_request_id IN (SELECT id FROM live_fr)
            AND category = 'material') AS fr_material,
        (SELECT COALESCE(SUM(amount), 0) FROM funding_request_lines
          WHERE funding_request_id IN (SELECT id FROM live_fr)
            AND category = 'labour') AS fr_labour,
        (SELECT COALESCE(SUM(amount), 0) FROM funding_request_lines
          WHERE funding_request_id IN (SELECT id FROM live_fr)
            AND category = 'fee') AS fr_fee,
        (SELECT COALESCE(SUM(amount), 0) FROM funding_request_lines
          WHERE funding_request_id IN (
            SELECT id FROM funding_requests
             WHERE stage_id = ${stageId} AND status = 'draft'
          ) AND category = 'fee') AS fr_fee_draft,
        (SELECT COALESCE(SUM(fee_amount), 0) FROM fee_invoices
          WHERE stage_id = ${stageId} AND status IN ('issued', 'paid')) AS fee_invoiced,
        (SELECT COALESCE(SUM(fee_amount), 0) FROM fee_invoices
          WHERE stage_id = ${stageId} AND status = 'paid') AS fee_received,
        EXISTS (
          SELECT 1 FROM funding_requests fr
           WHERE fr.stage_id = ${stageId} AND fr.status = 'issued'
             AND NOT EXISTS (
               SELECT 1 FROM deposits d
                WHERE d.funding_request_id = fr.id AND d.voided_at IS NULL
             )
        ) AS funding_request_pending
    `)
  ).rows[0];

  // --- Purchase Orders: exposure tracks the order (ticket 09 §4). An open
  //     (ordered) PO contributes `ordered − paid` to Open Purchase Commitments
  //     and its payments to Paid Purchases; a closed PO contributes only its
  //     payments; a cancelled PO nothing. --------------------------------------
  const poRows = (
    await tx.execute<{ status: string; ordered_total: string; paid_total: string }>(sql`
      SELECT
        po.status,
        COALESCE((SELECT SUM(l.qty_ordered * l.unit_price)
                    FROM purchase_order_lines l
                   WHERE l.purchase_order_id = po.id), 0) AS ordered_total,
        COALESCE((SELECT SUM(p.amount)
                    FROM payment_records p
                   WHERE p.purchase_order_id = po.id AND p.voided_at IS NULL), 0) AS paid_total
      FROM purchase_orders po
      WHERE po.stage_id = ${stageId} AND po.status IN ('ordered', 'closed')
    `)
  ).rows;

  let openPurchaseCommitments = 0;
  let paidPurchases = 0;
  for (const po of poRows) {
    const ordered = Number(po.ordered_total);
    const paid = Number(po.paid_total);
    paidPurchases += paid;
    if (po.status === "ordered") {
      openPurchaseCommitments += Math.max(0, ordered - paid);
    }
  }

  // --- Labour: per Task, the agreement's unpaid remainder is Open Labour
  //     Commitments; the sum paid is Labour Payments. Retention is dormant
  //     (Phase 1 decision 04), so no release adjustment. --------------------
  const labourRows = (
    await tx.execute<{ agreement: string; paid: string }>(sql`
      SELECT
        COALESCE(t.labour_revised, t.labour_original, 0) AS agreement,
        COALESCE((SELECT SUM(lp.amount)
                    FROM labour_payments lp
                   WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid
      FROM tasks t
      WHERE t.stage_id = ${stageId}
    `)
  ).rows;

  let openLabourCommitments = 0;
  let labourPayments = 0;
  let labourAgreementTotal = 0;
  for (const row of labourRows) {
    const agreement = Number(row.agreement);
    const paid = Number(row.paid);
    labourPayments += paid;
    labourAgreementTotal += agreement;
    openLabourCommitments += Math.max(0, agreement - paid);
  }

  // --- Material Take-Off: Total Estimated Material Cost, stage-level (ticket
  //     03 §3) — Σ every take-off line under every Task in the stage,
  //     current figures (the revised pair once either side of it has been
  //     written, else the original pair). A Variation-appended row
  //     (`variation_id` not null) is summed the same way as any other row:
  //     it carries only an original pair (`qty=1`, `est_unit_cost_original =
  //     material_impact`, ticket 01 §3), so it folds its signed
  //     `material_impact` straight into the estimate — exactly the increase
  //     (or decrease) an approved Variation is supposed to make, with no
  //     per-line matching against actual purchases that would otherwise read
  //     it as a spurious 100% saving. -----------------------------------
  const materialRow = (
    await tx.execute<{ material_estimated: string }>(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN ml.qty_revised IS NOT NULL OR ml.est_unit_cost_revised IS NOT NULL
            THEN COALESCE(ml.qty_revised, ml.qty_original, 0)
                 * COALESCE(ml.est_unit_cost_revised, ml.est_unit_cost_original, 0)
          ELSE COALESCE(ml.qty_original, 0) * COALESCE(ml.est_unit_cost_original, 0)
        END
      ), 0) AS material_estimated
      FROM material_lines ml
      JOIN tasks t ON t.id = ml.task_id
      WHERE t.stage_id = ${stageId}
    `)
  ).rows[0];
  const materialEstimated = Number(materialRow?.material_estimated ?? 0);

  // --- Petty cash + other approved commitments for the stage. ---------------
  const otherRow = (
    await tx.execute<{ petty_cash: string; other_commitments: string }>(sql`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM petty_cash_expenses
          WHERE stage_id = ${stageId} AND voided_at IS NULL) AS petty_cash,
        (SELECT COALESCE(SUM(amount), 0) FROM other_commitments
          WHERE stage_id = ${stageId} AND voided_at IS NULL) AS other_commitments
    `)
  ).rows[0];

  const frMaterial = Number(fundingRow?.fr_material ?? 0);
  const frLabour = Number(fundingRow?.fr_labour ?? 0);
  const frFee = Number(fundingRow?.fr_fee ?? 0);
  const feeRecorded = Number(fundingRow?.fr_fee_draft ?? 0);
  const feeInvoiced = Number(fundingRow?.fee_invoiced ?? 0);
  const pettyCashExpenses = Number(otherRow?.petty_cash ?? 0);
  const otherApprovedCommitments = Number(otherRow?.other_commitments ?? 0);

  return {
    clientDeposits: Number(fundingRow?.client_deposits ?? 0),
    openPurchaseCommitments,
    paidPurchases,
    openLabourCommitments,
    labourPayments,
    labourAgreementTotal,
    materialEstimated,
    pettyCashExpenses,
    otherApprovedCommitments,

    // Remaining = what the stage was scoped to cost (live Funding Request
    // lines) minus what has since been committed / paid. Floored at 0, which
    // also yields 0 before any Funding Request is issued (ticket 08 §2).
    remainingMaterial: Math.max(
      0,
      frMaterial - openPurchaseCommitments - paidPurchases,
    ),
    remainingLabour: Math.max(
      0,
      frLabour - openLabourCommitments - labourPayments,
    ),
    remainingFee: Math.max(0, frFee - feeInvoiced),
    remainingOtherApproved: 0,

    feeRecorded,
    feeInvoiced,
    feeReceived: Number(fundingRow?.fee_received ?? 0),

    fundingRequestPending: fundingRow?.funding_request_pending ?? false,
  };
}
