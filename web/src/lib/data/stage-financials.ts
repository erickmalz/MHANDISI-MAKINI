import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { sumStageFinancials } from "@/lib/finance";
import type { StageFinancials } from "@/lib/types";

import type { AccountTx } from "./with-account";

/**
 * Stage Financials (`CONTEXT.md`) — the one module that reads the raw money
 * figures every money position derives from. Every SQL read that produces a
 * `StageFinancials` figure, or a project total of one, lives here; callers
 * never re-sum stages or copy these queries (`.scratch/stage-financials/map.md`).
 * `@/lib/finance` then derives Available Float, the Financial Health
 * Indicator, the variances, etc. from what this returns.
 *
 * Both reads take the caller's `tx`, so a caller already inside its own
 * transaction (closeout, reconciliation) reads the same snapshot it writes.
 * Both run the **same four queries**, differing only in which stages they
 * select — a stage figure and the project roll-up cannot drift apart, and a
 * project read costs four queries however many stages it has.
 *
 * Built by summing the atomic records — Deposits, Funding Request lines, Fee
 * Invoices, Purchase Orders (+ lines + payments), Labour Payments, Petty Cash
 * Expenses, Other Commitments — inside the caller's RLS transaction. There are
 * **no denormalised stage totals** (multi-tenancy ticket 08 §1).
 *
 * Money columns come back from `execute` as strings (bigint / numeric) — every
 * value is `Number()`-ed here. TZS amounts are whole numbers well inside the
 * safe integer range.
 *
 * `remainingOtherApproved` is 0 — see `.scratch/phase2/slice-2.2-runbook.md`.
 *
 * `materialEstimated` / `labourAgreementTotal` (Phase 3 ticket 03 — Budget
 * Variance Analysis) are the stage-level Approved Estimate each side of the
 * variance reconciles against; `@/lib/finance`'s `materialVariance`/
 * `labourVariance` derive the variance figures from these plus
 * `paidPurchases`/`labourPayments` — "one authoritative calculation path"
 * (guidelines §51).
 */

export interface ProjectFinancials {
  /** Every stage of the project, in `seq` order. */
  byStage: Map<string, StageFinancials>;
  /**
   * The project roll-up — the one place stages are summed. Every field is a
   * plain sum; a project-level Forecast Funding Requirement must still come
   * from `aggregateStageFinancials` over `byStage`, never from `totals`.
   */
  totals: StageFinancials;
}

export async function readProjectFinancials(
  tx: AccountTx,
  projectId: string,
): Promise<ProjectFinancials> {
  const byStage = await readFinancials(tx, sql`s.project_id = ${projectId}`);
  return { byStage, totals: sumStageFinancials([...byStage.values()]) };
}

/**
 * One stage's figures. A stage id this Account can't see (RLS) reads as all
 * zeros, the same as a stage with no records yet.
 */
export async function readStageFinancials(
  tx: AccountTx,
  stageId: string,
): Promise<StageFinancials> {
  const byStage = await readFinancials(tx, sql`s.id = ${stageId}`);
  return byStage.get(stageId) ?? sumStageFinancials([]);
}

/** Per-stage running figures, accumulated across the four queries below. */
interface Accumulator {
  clientDeposits: number;
  frMaterial: number;
  frLabour: number;
  frFee: number;
  feeRecorded: number;
  feeInvoiced: number;
  /** Fee already dealt with by a Fee Invoice, incl. voided / reduced amounts. */
  feeBilled: number;
  feeReceived: number;
  fundingRequestPending: boolean;
  pettyCashExpenses: number;
  otherApprovedCommitments: number;
  openPurchaseCommitments: number;
  paidPurchases: number;
  openLabourCommitments: number;
  labourPayments: number;
  labourAgreementTotal: number;
  materialEstimated: number;
  materialEstimatedOriginal: number;
}

/**
 * The four queries, over whichever stages `stageFilter` (a predicate on
 * `stages s`) selects. Returned in `seq` order.
 */
async function readFinancials(
  tx: AccountTx,
  stageFilter: SQL,
): Promise<Map<string, StageFinancials>> {
  const acc = new Map<string, Accumulator>();

  // --- 1. Funding-request-scoped figures — deposits, the stage's scoped cost
  //     (live FR lines), fee recorded / invoiced / received, the pending flag
  //     — plus petty cash and other approved commitments. One row per stage,
  //     so this query also fixes the stage set and its order. ---------------
  const stageRows = (
    await tx.execute<{
      stage_id: string;
      client_deposits: string;
      fr_material: string;
      fr_labour: string;
      fr_fee: string;
      fr_fee_draft: string;
      fee_invoiced: string;
      fee_billed: string;
      fee_received: string;
      funding_request_pending: boolean;
      petty_cash: string;
      other_commitments: string;
    }>(sql`
      SELECT
        s.id AS stage_id,
        (SELECT COALESCE(SUM(d.amount), 0)
           FROM deposits d
           JOIN funding_requests fr ON fr.id = d.funding_request_id
          WHERE fr.stage_id = s.id AND d.voided_at IS NULL) AS client_deposits,
        (SELECT COALESCE(SUM(l.amount), 0)
           FROM funding_request_lines l
           JOIN funding_requests fr ON fr.id = l.funding_request_id
          WHERE fr.stage_id = s.id AND fr.status IN ('issued', 'closed')
            AND l.category = 'material') AS fr_material,
        (SELECT COALESCE(SUM(l.amount), 0)
           FROM funding_request_lines l
           JOIN funding_requests fr ON fr.id = l.funding_request_id
          WHERE fr.stage_id = s.id AND fr.status IN ('issued', 'closed')
            AND l.category = 'labour') AS fr_labour,
        (SELECT COALESCE(SUM(l.amount), 0)
           FROM funding_request_lines l
           JOIN funding_requests fr ON fr.id = l.funding_request_id
          WHERE fr.stage_id = s.id AND fr.status IN ('issued', 'closed')
            AND l.category = 'fee') AS fr_fee,
        (SELECT COALESCE(SUM(l.amount), 0)
           FROM funding_request_lines l
           JOIN funding_requests fr ON fr.id = l.funding_request_id
          WHERE fr.stage_id = s.id AND fr.status = 'draft'
            AND l.category = 'fee') AS fr_fee_draft,
        (SELECT COALESCE(SUM(fi.fee_amount), 0) FROM fee_invoices fi
          WHERE fi.stage_id = s.id AND fi.status IN ('issued', 'paid')) AS fee_invoiced,
        -- The fee each invoice was first raised for, voided ones included, so a
        -- voided or corrected-down fee is not read back as still to be billed.
        (SELECT COALESCE(SUM(COALESCE(fi.original_fee_amount, fi.fee_amount)), 0)
           FROM fee_invoices fi
          WHERE fi.stage_id = s.id) AS fee_billed,
        (SELECT COALESCE(SUM(fi.fee_amount), 0) FROM fee_invoices fi
          WHERE fi.stage_id = s.id AND fi.status = 'paid') AS fee_received,
        EXISTS (
          SELECT 1 FROM funding_requests fr
           WHERE fr.stage_id = s.id AND fr.status = 'issued'
             AND NOT EXISTS (
               SELECT 1 FROM deposits d
                WHERE d.funding_request_id = fr.id AND d.voided_at IS NULL
             )
        ) AS funding_request_pending,
        (SELECT COALESCE(SUM(pc.amount), 0) FROM petty_cash_expenses pc
          WHERE pc.stage_id = s.id AND pc.voided_at IS NULL) AS petty_cash,
        (SELECT COALESCE(SUM(oc.amount), 0) FROM other_commitments oc
          WHERE oc.stage_id = s.id AND oc.voided_at IS NULL) AS other_commitments
      FROM stages s
      WHERE ${stageFilter}
      ORDER BY s.seq
    `)
  ).rows;

  for (const r of stageRows) {
    acc.set(r.stage_id, {
      clientDeposits: Number(r.client_deposits),
      frMaterial: Number(r.fr_material),
      frLabour: Number(r.fr_labour),
      frFee: Number(r.fr_fee),
      feeRecorded: Number(r.fr_fee_draft),
      feeInvoiced: Number(r.fee_invoiced),
      feeBilled: Number(r.fee_billed),
      feeReceived: Number(r.fee_received),
      fundingRequestPending: r.funding_request_pending,
      pettyCashExpenses: Number(r.petty_cash),
      otherApprovedCommitments: Number(r.other_commitments),
      openPurchaseCommitments: 0,
      paidPurchases: 0,
      openLabourCommitments: 0,
      labourPayments: 0,
      labourAgreementTotal: 0,
      materialEstimated: 0,
      materialEstimatedOriginal: 0,
    });
  }
  if (acc.size === 0) return new Map();

  // --- 2. Purchase Orders: exposure tracks the order (ticket 09 §4). An open
  //     (ordered) PO contributes `ordered − paid` to Open Purchase Commitments
  //     and its payments to Paid Purchases; a closed PO contributes only its
  //     payments; a cancelled or planned PO nothing. -------------------------
  const poRows = (
    await tx.execute<{
      stage_id: string;
      status: string;
      ordered_total: string;
      paid_total: string;
    }>(sql`
      SELECT
        po.stage_id,
        po.status,
        COALESCE((SELECT SUM(l.qty_ordered * l.unit_price)
                    FROM purchase_order_lines l
                   WHERE l.purchase_order_id = po.id), 0) AS ordered_total,
        COALESCE((SELECT SUM(p.amount)
                    FROM payment_records p
                   WHERE p.purchase_order_id = po.id AND p.voided_at IS NULL), 0) AS paid_total
      FROM purchase_orders po
      JOIN stages s ON s.id = po.stage_id
      WHERE ${stageFilter} AND po.status IN ('ordered', 'closed')
    `)
  ).rows;

  for (const po of poRows) {
    const a = acc.get(po.stage_id);
    if (!a) continue;
    const ordered = Number(po.ordered_total);
    const paid = Number(po.paid_total);
    a.paidPurchases += paid;
    if (po.status === "ordered") {
      a.openPurchaseCommitments += Math.max(0, ordered - paid);
    }
  }

  // --- 3. Labour: per Task, the agreement's unpaid remainder is Open Labour
  //     Commitments; the sum paid is Labour Payments. Retention is dormant
  //     (Phase 1 decision 04), so no release adjustment. --------------------
  const labourRows = (
    await tx.execute<{ stage_id: string; agreement: string; paid: string }>(sql`
      SELECT
        t.stage_id,
        COALESCE(t.labour_revised, t.labour_original, 0) AS agreement,
        COALESCE((SELECT SUM(lp.amount)
                    FROM labour_payments lp
                   WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid
      FROM tasks t
      JOIN stages s ON s.id = t.stage_id
      WHERE ${stageFilter}
    `)
  ).rows;

  for (const row of labourRows) {
    const a = acc.get(row.stage_id);
    if (!a) continue;
    const agreement = Number(row.agreement);
    const paid = Number(row.paid);
    a.labourPayments += paid;
    a.labourAgreementTotal += agreement;
    a.openLabourCommitments += Math.max(0, agreement - paid);
  }

  // --- 4. Material Take-Off: Total Estimated Material Cost, stage-level
  //     (ticket 03 §3) — Σ every take-off line under every Task in the stage,
  //     current figures (the revised pair once either side of it has been
  //     written, else the original pair) — and the same lines' original-only
  //     total. A Variation-appended row (`variation_id` not null) is summed the
  //     same way as any other row: it carries only an original pair (`qty=1`,
  //     `est_unit_cost_original = material_impact`, ticket 01 §3), so it folds
  //     its signed `material_impact` straight into the estimate — exactly the
  //     increase (or decrease) an approved Variation is supposed to make, with
  //     no per-line matching against actual purchases that would otherwise
  //     read it as a spurious 100% saving. ----------------------------------
  const materialRows = (
    await tx.execute<{
      stage_id: string;
      material_estimated: string;
      material_estimated_original: string;
    }>(sql`
      SELECT
        t.stage_id,
        COALESCE(SUM(
          CASE
            WHEN ml.qty_revised IS NOT NULL OR ml.est_unit_cost_revised IS NOT NULL
              THEN COALESCE(ml.qty_revised, ml.qty_original, 0)
                   * COALESCE(ml.est_unit_cost_revised, ml.est_unit_cost_original, 0)
            ELSE COALESCE(ml.qty_original, 0) * COALESCE(ml.est_unit_cost_original, 0)
          END
        ), 0) AS material_estimated,
        COALESCE(SUM(
          COALESCE(ml.qty_original, 0) * COALESCE(ml.est_unit_cost_original, 0)
        ), 0) AS material_estimated_original
      FROM material_lines ml
      JOIN tasks t ON t.id = ml.task_id
      JOIN stages s ON s.id = t.stage_id
      WHERE ${stageFilter}
      GROUP BY t.stage_id
    `)
  ).rows;

  for (const row of materialRows) {
    const a = acc.get(row.stage_id);
    if (!a) continue;
    a.materialEstimated = Number(row.material_estimated);
    a.materialEstimatedOriginal = Number(row.material_estimated_original);
  }

  const result = new Map<string, StageFinancials>();
  for (const [stageId, a] of acc) result.set(stageId, toStageFinancials(a));
  return result;
}

function toStageFinancials(a: Accumulator): StageFinancials {
  return {
    clientDeposits: a.clientDeposits,
    openPurchaseCommitments: a.openPurchaseCommitments,
    paidPurchases: a.paidPurchases,
    openLabourCommitments: a.openLabourCommitments,
    labourPayments: a.labourPayments,
    labourAgreementTotal: a.labourAgreementTotal,
    materialEstimated: a.materialEstimated,
    materialEstimatedOriginal: a.materialEstimatedOriginal,
    pettyCashExpenses: a.pettyCashExpenses,
    otherApprovedCommitments: a.otherApprovedCommitments,

    // Remaining = what the stage was scoped to cost (live Funding Request
    // lines) minus what has since been committed / paid. Floored at 0, which
    // also yields 0 before any Funding Request is issued (ticket 08 §2).
    remainingMaterial: Math.max(0, a.frMaterial - a.openPurchaseCommitments - a.paidPurchases),
    remainingLabour: Math.max(0, a.frLabour - a.openLabourCommitments - a.labourPayments),
    remainingFee: Math.max(0, a.frFee - a.feeBilled),
    remainingOtherApproved: 0,

    feeRecorded: a.feeRecorded,
    feeInvoiced: a.feeInvoiced,
    feeReceived: a.feeReceived,

    fundingRequestPending: a.fundingRequestPending,
  };
}
