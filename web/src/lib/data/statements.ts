import "server-only";

import type { ReportFilters } from "@/lib/reports/filters";

import { eq, sql } from "drizzle-orm";

import { subcontractors, suppliers } from "./schema";
import { withAccount } from "./with-account";

/**
 * Supplier / Subcontractor Statements (Operational Control decision 5,
 * `.scratch/operational-control/map.md`) — an always-live, all-time,
 * all-project view of one register entry's history. Unlike the issued
 * documents (ticket 10), there is no frozen snapshot: a Statement always
 * reflects the current state of every Purchase Order / Task it touches, so
 * it is read straight off the live tables on every request, never rendered
 * to PDF/JPG (deferred — see the map).
 *
 * No `accountId` in any signature, same as every other DAL read: `withAccount`
 * scopes every query to the caller's Account via RLS.
 */

export interface SupplierStatementOrder {
  purchaseOrderId: string;
  projectId: string;
  displayNumber: string | null;
  status: string;
  projectName: string;
  stageName: string;
  orderedTotal: number;
  createdAt: string;
}

export interface SupplierStatementPayment {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  displayNumber: string | null;
  projectName: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
}

export interface SupplierStatement {
  supplierId: string;
  name: string;
  orders: SupplierStatementOrder[];
  payments: SupplierStatementPayment[];
  /** Σ over non-cancelled orders of max(0, ordered total − paid), account-wide. */
  outstandingBalance: number;
}

export interface SubcontractorStatementTask {
  taskId: string;
  projectId: string;
  description: string;
  status: string;
  projectName: string;
  stageName: string;
  agreedAmount: number;
}

export interface SubcontractorStatementPayment {
  id: string;
  taskId: string;
  projectId: string;
  taskDescription: string;
  projectName: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
}

export interface SubcontractorStatement {
  subcontractorId: string;
  name: string;
  tasks: SubcontractorStatementTask[];
  payments: SubcontractorStatementPayment[];
  /** Σ over non-cancelled tasks of max(0, agreed amount − paid), account-wide. */
  outstandingBalance: number;
}

/** One Supplier's full account-wide statement, or `null` (missing / cross-account). */
export async function getSupplierStatement(
  supplierId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<SupplierStatement | null> {
  void filters;
  return withAccount(async (tx) => {
    const [supplier] = await tx
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    if (!supplier) return null;

    const orderRows = (
      await tx.execute<{
        id: string;
        project_id: string;
        display_number: string | null;
        status: string;
        project_name: string;
        stage_name: string;
        ordered_total: string;
        created_at: string;
        paid_total: string;
      }>(sql`
        SELECT
          po.id, p.id AS project_id, po.display_number, po.status, po.created_at,
          p.name AS project_name, s.name AS stage_name,
          COALESCE((SELECT SUM(l.qty_ordered * l.unit_price) FROM purchase_order_lines l
                     WHERE l.purchase_order_id = po.id), 0) AS ordered_total,
          COALESCE((SELECT SUM(pr.amount) FROM payment_records pr
                     WHERE pr.purchase_order_id = po.id AND pr.voided_at IS NULL), 0) AS paid_total
        FROM purchase_orders po
        JOIN stages s ON s.id = po.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE po.supplier_id = ${supplierId}
        ORDER BY po.created_at DESC
      `)
    ).rows;

    const paymentRows = (
      await tx.execute<{
        id: string;
        purchase_order_id: string;
        project_id: string;
        display_number: string | null;
        project_name: string;
        amount: string;
        paid_on: string;
        method: string;
        reference: string | null;
      }>(sql`
        SELECT pr.id, pr.purchase_order_id, p.id AS project_id, po.display_number, p.name AS project_name,
               pr.amount, pr.paid_on, pr.method, pr.reference
        FROM payment_records pr
        JOIN purchase_orders po ON po.id = pr.purchase_order_id
        JOIN stages s ON s.id = po.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE po.supplier_id = ${supplierId} AND pr.voided_at IS NULL
        ORDER BY pr.paid_on DESC
      `)
    ).rows;

    let outstandingBalance = 0;
    for (const row of orderRows) {
      if (row.status === "cancelled") continue;
      outstandingBalance += Math.max(0, Number(row.ordered_total) - Number(row.paid_total));
    }

    return {
      supplierId,
      name: supplier.name,
      orders: orderRows.map((r) => ({
        purchaseOrderId: r.id,
        projectId: r.project_id,
        displayNumber: r.display_number,
        status: r.status,
        projectName: r.project_name,
        stageName: r.stage_name,
        orderedTotal: Number(r.ordered_total),
        createdAt: r.created_at,
      })),
      payments: paymentRows.map((r) => ({
        id: r.id,
        purchaseOrderId: r.purchase_order_id,
        projectId: r.project_id,
        displayNumber: r.display_number,
        projectName: r.project_name,
        amount: Number(r.amount),
        paidOn: r.paid_on,
        method: r.method,
        reference: r.reference,
      })),
      outstandingBalance,
    };
  });
}

/** One Subcontractor's full account-wide statement, or `null` (missing / cross-account). */
export async function getSubcontractorStatement(
  subcontractorId: string,
  /** Contract: filters builder applies these (ticket "Which filters each report gets"). */
  filters: ReportFilters = {},
): Promise<SubcontractorStatement | null> {
  void filters;
  return withAccount(async (tx) => {
    const [subcontractor] = await tx
      .select({ name: subcontractors.name })
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);
    if (!subcontractor) return null;

    const taskRows = (
      await tx.execute<{
        id: string;
        project_id: string;
        description: string;
        status: string;
        project_name: string;
        stage_name: string;
        agreed_amount: string;
        paid_total: string;
      }>(sql`
        SELECT
          t.id, p.id AS project_id, t.description, t.status,
          p.name AS project_name, s.name AS stage_name,
          COALESCE(t.labour_revised, t.labour_original, 0) AS agreed_amount,
          COALESCE((SELECT SUM(lp.amount) FROM labour_payments lp
                     WHERE lp.task_id = t.id AND lp.voided_at IS NULL), 0) AS paid_total
        FROM tasks t
        JOIN stages s ON s.id = t.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE t.subcontractor_id = ${subcontractorId}
        ORDER BY t.created_at DESC
      `)
    ).rows;

    const paymentRows = (
      await tx.execute<{
        id: string;
        task_id: string;
        project_id: string;
        task_description: string;
        project_name: string;
        amount: string;
        paid_on: string;
        method: string;
        reference: string | null;
      }>(sql`
        SELECT lp.id, lp.task_id, p.id AS project_id, t.description AS task_description, p.name AS project_name,
               lp.amount, lp.paid_on, lp.method, lp.reference
        FROM labour_payments lp
        JOIN tasks t ON t.id = lp.task_id
        JOIN stages s ON s.id = t.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE t.subcontractor_id = ${subcontractorId} AND lp.voided_at IS NULL
        ORDER BY lp.paid_on DESC
      `)
    ).rows;

    let outstandingBalance = 0;
    for (const row of taskRows) {
      if (row.status === "cancelled") continue;
      outstandingBalance += Math.max(0, Number(row.agreed_amount) - Number(row.paid_total));
    }

    return {
      subcontractorId,
      name: subcontractor.name,
      tasks: taskRows.map((r) => ({
        taskId: r.id,
        projectId: r.project_id,
        description: r.description,
        status: r.status,
        projectName: r.project_name,
        stageName: r.stage_name,
        agreedAmount: Number(r.agreed_amount),
      })),
      payments: paymentRows.map((r) => ({
        id: r.id,
        taskId: r.task_id,
        projectId: r.project_id,
        taskDescription: r.task_description,
        projectName: r.project_name,
        amount: Number(r.amount),
        paidOn: r.paid_on,
        method: r.method,
        reference: r.reference,
      })),
      outstandingBalance,
    };
  });
}

