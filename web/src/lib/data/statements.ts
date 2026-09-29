import "server-only";

import { cache } from "react";

import {
  PO_STORED_STATUS_ORDER,
  TASK_STATUS_ORDER,
  type FilterOptions,
  inDateRange,
  presentInOrder,
  sanitizeFilters,
  sortedByLabel,
} from "@/lib/reports/filter-logic";
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
  /** The order's date for filtering: issue date, or creation date while Planned (EAT, YYYY-MM-DD). */
  orderedOn: string;
}

export interface SupplierStatementPayment {
  id: string;
  purchaseOrderId: string;
  /** The stored status of the order this payment is against. */
  orderStatus: string;
  projectId: string;
  displayNumber: string | null;
  projectName: string;
  amount: number;
  paidOn: string;
  /** `paidOn` as a plain calendar date (YYYY-MM-DD). */
  paidDate: string;
  method: string;
  reference: string | null;
}

export interface SupplierStatement {
  supplierId: string;
  name: string;
  orders: SupplierStatementOrder[];
  payments: SupplierStatementPayment[];
  /** Σ over non-cancelled orders of max(0, ordered total − paid), account-wide (over the filtered orders when filtered). */
  outstandingBalance: number;
}

/** What a filtered statement carries besides its own figures. */
export interface StatementFilterFields {
  /** The choices per dimension — only values that occur on this statement. Enum labels are raw values. */
  filterOptions: FilterOptions;
  /** The filters actually applied, after unknown values were dropped. */
  appliedFilters: ReportFilters;
}

export type FilteredSupplierStatement = SupplierStatement & StatementFilterFields;

export interface SubcontractorStatementTask {
  taskId: string;
  projectId: string;
  description: string;
  status: string;
  projectName: string;
  stageName: string;
  agreedAmount: number;
  /** The date the task (its labour agreement) was created (EAT, YYYY-MM-DD). */
  agreedOn: string;
}

export interface SubcontractorStatementPayment {
  id: string;
  taskId: string;
  /** The stored status of the task this payment is against. */
  taskStatus: string;
  projectId: string;
  taskDescription: string;
  projectName: string;
  amount: number;
  paidOn: string;
  /** `paidOn` as a plain calendar date (YYYY-MM-DD). */
  paidDate: string;
  method: string;
  reference: string | null;
}

export interface SubcontractorStatement {
  subcontractorId: string;
  name: string;
  tasks: SubcontractorStatementTask[];
  payments: SubcontractorStatementPayment[];
  /** Σ over non-cancelled tasks of max(0, agreed amount − paid), account-wide (over the filtered tasks when filtered). */
  outstandingBalance: number;
}

export type FilteredSubcontractorStatement = SubcontractorStatement & StatementFilterFields;

type SupplierOrderRow = {
  id: string;
  project_id: string;
  display_number: string | null;
  status: string;
  project_name: string;
  stage_name: string;
  ordered_total: string;
  created_at: string;
  ordered_on: string;
  paid_total: string;
};

type SupplierPaymentRow = {
  id: string;
  purchase_order_id: string;
  order_status: string;
  project_id: string;
  display_number: string | null;
  project_name: string;
  amount: string;
  paid_on: string;
  paid_date: string;
  method: string;
  reference: string | null;
};

const loadSupplierStatement = cache(async (supplierId: string) =>
  withAccount(async (tx) => {
    const [supplier] = await tx
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    if (!supplier) return null;

    const orderRows = (
      await tx.execute<SupplierOrderRow>(sql`
        SELECT
          po.id, p.id AS project_id, po.display_number, po.status, po.created_at,
          to_char(COALESCE(po.ordered_at, po.created_at) AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD') AS ordered_on,
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
      await tx.execute<SupplierPaymentRow>(sql`
        SELECT pr.id, pr.purchase_order_id, po.status AS order_status, p.id AS project_id,
               po.display_number, p.name AS project_name,
               pr.amount, pr.paid_on, pr.paid_on::text AS paid_date, pr.method, pr.reference
        FROM payment_records pr
        JOIN purchase_orders po ON po.id = pr.purchase_order_id
        JOIN stages s ON s.id = po.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE po.supplier_id = ${supplierId} AND pr.voided_at IS NULL
        ORDER BY pr.paid_on DESC
      `)
    ).rows;

    return { name: supplier.name, orderRows, paymentRows };
  }),
);

/**
 * One Supplier's full account-wide statement, or `null` (missing /
 * cross-account). Filters (ticket "Do the Supplier and Subcontractor
 * Statements get the report toolbar?"): Project · PO status · date range, one
 * value each, AND. Orders filter on their own date (issue date, or creation
 * date while Planned); payments on their payment date, plus the project and
 * the status of the order they pay. The outstanding balance is over the
 * orders shown. Unknown values are dropped (treated as "All").
 */
export async function getSupplierStatement(
  supplierId: string,
  /** Project · PO status · date range. */
  filters: ReportFilters = {},
): Promise<FilteredSupplierStatement | null> {
  const data = await loadSupplierStatement(supplierId);
  if (!data) return null;
  const { orderRows, paymentRows } = data;

  const filterOptions: FilterOptions = {
    project: sortedByLabel([
      ...orderRows.map((r) => ({ value: r.project_id, label: r.project_name })),
      ...paymentRows.map((r) => ({ value: r.project_id, label: r.project_name })),
    ]),
    status: presentInOrder(PO_STORED_STATUS_ORDER, orderRows.map((r) => r.status)),
  };
  const f = sanitizeFilters("supplier-statement", filters, filterOptions);

  const orders = orderRows.filter(
    (r) =>
      (!f.project || r.project_id === f.project) &&
      (!f.status || r.status === f.status) &&
      inDateRange(r.ordered_on, f.from, f.to),
  );
  const payments = paymentRows.filter(
    (r) =>
      (!f.project || r.project_id === f.project) &&
      (!f.status || r.order_status === f.status) &&
      inDateRange(r.paid_date, f.from, f.to),
  );

  let outstandingBalance = 0;
  for (const row of orders) {
    if (row.status === "cancelled") continue;
    outstandingBalance += Math.max(0, Number(row.ordered_total) - Number(row.paid_total));
  }

  return {
    supplierId,
    name: data.name,
    orders: orders.map((r) => ({
      purchaseOrderId: r.id,
      projectId: r.project_id,
      displayNumber: r.display_number,
      status: r.status,
      projectName: r.project_name,
      stageName: r.stage_name,
      orderedTotal: Number(r.ordered_total),
      createdAt: r.created_at,
      orderedOn: r.ordered_on,
    })),
    payments: payments.map((r) => ({
      id: r.id,
      purchaseOrderId: r.purchase_order_id,
      orderStatus: r.order_status,
      projectId: r.project_id,
      displayNumber: r.display_number,
      projectName: r.project_name,
      amount: Number(r.amount),
      paidOn: r.paid_on,
      paidDate: r.paid_date,
      method: r.method,
      reference: r.reference,
    })),
    outstandingBalance,
    filterOptions,
    appliedFilters: f,
  };
}

type SubcontractorTaskRow = {
  id: string;
  project_id: string;
  description: string;
  status: string;
  project_name: string;
  stage_name: string;
  agreed_amount: string;
  agreed_on: string;
  paid_total: string;
};

type SubcontractorPaymentRow = {
  id: string;
  task_id: string;
  task_status: string;
  project_id: string;
  task_description: string;
  project_name: string;
  amount: string;
  paid_on: string;
  paid_date: string;
  method: string;
  reference: string | null;
};

const loadSubcontractorStatement = cache(async (subcontractorId: string) =>
  withAccount(async (tx) => {
    const [subcontractor] = await tx
      .select({ name: subcontractors.name })
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);
    if (!subcontractor) return null;

    const taskRows = (
      await tx.execute<SubcontractorTaskRow>(sql`
        SELECT
          t.id, p.id AS project_id, t.description, t.status,
          p.name AS project_name, s.name AS stage_name,
          COALESCE(t.labour_revised, t.labour_original, 0) AS agreed_amount,
          to_char(t.created_at AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD') AS agreed_on,
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
      await tx.execute<SubcontractorPaymentRow>(sql`
        SELECT lp.id, lp.task_id, t.status AS task_status, p.id AS project_id,
               t.description AS task_description, p.name AS project_name,
               lp.amount, lp.paid_on, lp.paid_on::text AS paid_date, lp.method, lp.reference
        FROM labour_payments lp
        JOIN tasks t ON t.id = lp.task_id
        JOIN stages s ON s.id = t.stage_id
        JOIN projects p ON p.id = s.project_id
        WHERE t.subcontractor_id = ${subcontractorId} AND lp.voided_at IS NULL
        ORDER BY lp.paid_on DESC
      `)
    ).rows;

    return { name: subcontractor.name, taskRows, paymentRows };
  }),
);

/**
 * One Subcontractor's full account-wide statement, or `null` (missing /
 * cross-account). Filters: Project · Task status · date range, one value each,
 * AND. Tasks filter on the date their labour agreement was created; payments
 * on their payment date, plus the project and the status of the task they pay.
 * The outstanding balance is over the tasks shown. Unknown values are dropped
 * (treated as "All").
 */
export async function getSubcontractorStatement(
  subcontractorId: string,
  /** Project · Task status · date range. */
  filters: ReportFilters = {},
): Promise<FilteredSubcontractorStatement | null> {
  const data = await loadSubcontractorStatement(subcontractorId);
  if (!data) return null;
  const { taskRows, paymentRows } = data;

  const filterOptions: FilterOptions = {
    project: sortedByLabel([
      ...taskRows.map((r) => ({ value: r.project_id, label: r.project_name })),
      ...paymentRows.map((r) => ({ value: r.project_id, label: r.project_name })),
    ]),
    status: presentInOrder(TASK_STATUS_ORDER, taskRows.map((r) => r.status)),
  };
  const f = sanitizeFilters("subcontractor-statement", filters, filterOptions);

  const tasks = taskRows.filter(
    (r) =>
      (!f.project || r.project_id === f.project) &&
      (!f.status || r.status === f.status) &&
      inDateRange(r.agreed_on, f.from, f.to),
  );
  const payments = paymentRows.filter(
    (r) =>
      (!f.project || r.project_id === f.project) &&
      (!f.status || r.task_status === f.status) &&
      inDateRange(r.paid_date, f.from, f.to),
  );

  let outstandingBalance = 0;
  for (const row of tasks) {
    if (row.status === "cancelled") continue;
    outstandingBalance += Math.max(0, Number(row.agreed_amount) - Number(row.paid_total));
  }

  return {
    subcontractorId,
    name: data.name,
    tasks: tasks.map((r) => ({
      taskId: r.id,
      projectId: r.project_id,
      description: r.description,
      status: r.status,
      projectName: r.project_name,
      stageName: r.stage_name,
      agreedAmount: Number(r.agreed_amount),
      agreedOn: r.agreed_on,
    })),
    payments: payments.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      taskStatus: r.task_status,
      projectId: r.project_id,
      taskDescription: r.task_description,
      projectName: r.project_name,
      amount: Number(r.amount),
      paidOn: r.paid_on,
      paidDate: r.paid_date,
      method: r.method,
      reference: r.reference,
    })),
    outstandingBalance,
    filterOptions,
    appliedFilters: f,
  };
}

