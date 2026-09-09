import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import type {
  DeliveryRecord,
  PaymentMethod,
  POMaterialLine,
  PurchaseOrder,
  SupplierPaymentKind,
} from "@/lib/procurement";

import {
  deliveryRecordLines,
  deliveryRecords,
  paymentRecords,
  projects,
  purchaseOrderLines,
  purchaseOrders,
  stages,
  suppliers,
} from "./schema";
import type { DocumentSnapshot } from "./schema/snapshot";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The read side of the Purchase Order DAL (multi-tenancy ticket 08 §3). No
 * `accountId` in any signature — `withAccount` injects the tenant key and
 * Postgres RLS is the backstop, so a cross-account id simply resolves to an
 * empty list / `null` and the screen calls `notFound()`.
 *
 * Both functions return the nested `PurchaseOrder` view-model from
 * `@/lib/procurement`, with each line's delivered / accepted / rejected
 * quantities rolled up from the **non-voided** delivery records (Ordered ≠
 * Delivered ≠ Accepted — no stored quantity columns, guidelines §23).
 */

const PAYMENT_METHOD_LABELS: Record<string, PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

const PAYMENT_KIND_LABELS: Record<string, SupplierPaymentKind> = {
  deposit: "Deposit",
  partial: "Partial",
  final: "Final",
};

const iso = (v: Date | string | null): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : v;

const poSelection = {
  id: purchaseOrders.id,
  status: purchaseOrders.status,
  displayNumber: purchaseOrders.displayNumber,
  stageId: purchaseOrders.stageId,
  stageName: stages.name,
  projectId: stages.projectId,
  projectName: projects.name,
  supplierId: purchaseOrders.supplierId,
  registerSupplierName: suppliers.name,
  documentSnapshot: purchaseOrders.documentSnapshot,
  expectedDeliveryOn: purchaseOrders.expectedDeliveryOn,
  paymentTerms: purchaseOrders.paymentTerms,
  notes: purchaseOrders.notes,
  supplierAckNote: purchaseOrders.supplierAckNote,
  supplierAckOn: purchaseOrders.supplierAckOn,
  cancelReason: purchaseOrders.cancelReason,
  orderedAt: purchaseOrders.orderedAt,
  cancelledAt: purchaseOrders.cancelledAt,
  closedAt: purchaseOrders.closedAt,
  reopenedAt: purchaseOrders.reopenedAt,
} as const;

type PoRow = {
  id: string;
  status: PurchaseOrder["status"];
  displayNumber: string | null;
  stageId: string;
  stageName: string;
  projectId: string;
  projectName: string;
  supplierId: string | null;
  registerSupplierName: string | null;
  documentSnapshot: DocumentSnapshot | null;
  expectedDeliveryOn: string | null;
  paymentTerms: string | null;
  notes: string | null;
  supplierAckNote: string | null;
  supplierAckOn: string | null;
  cancelReason: string | null;
  orderedAt: Date | string | null;
  cancelledAt: Date | string | null;
  closedAt: Date | string | null;
  reopenedAt: Date | string | null;
};

async function assemble(tx: AccountTx, poRows: PoRow[]): Promise<PurchaseOrder[]> {
  if (poRows.length === 0) return [];
  const poIds = poRows.map((r) => r.id);

  const lineRows = await tx
    .select()
    .from(purchaseOrderLines)
    .where(inArray(purchaseOrderLines.purchaseOrderId, poIds))
    .orderBy(asc(purchaseOrderLines.seq));

  const deliveryRows = await tx
    .select()
    .from(deliveryRecords)
    .where(inArray(deliveryRecords.purchaseOrderId, poIds))
    .orderBy(asc(deliveryRecords.deliveredOn));

  const deliveryIds = deliveryRows.map((d) => d.id);
  const deliveryLineRows = deliveryIds.length
    ? await tx
        .select()
        .from(deliveryRecordLines)
        .where(inArray(deliveryRecordLines.deliveryRecordId, deliveryIds))
    : [];

  const paymentRows = await tx
    .select()
    .from(paymentRecords)
    .where(inArray(paymentRecords.purchaseOrderId, poIds))
    .orderBy(asc(paymentRecords.paidOn));

  const deliveryLinesByDelivery = new Map<string, typeof deliveryLineRows>();
  for (const dl of deliveryLineRows) {
    const list = deliveryLinesByDelivery.get(dl.deliveryRecordId) ?? [];
    list.push(dl);
    deliveryLinesByDelivery.set(dl.deliveryRecordId, list);
  }

  const deliveriesByPo = new Map<string, DeliveryRecord[]>();
  // Per PO line, the quantities so far — non-voided deliveries only.
  const rollupByLine = new Map<
    string,
    { delivered: number; accepted: number; rejected: number }
  >();

  for (const d of deliveryRows) {
    const lines = (deliveryLinesByDelivery.get(d.id) ?? []).map((dl) => ({
      lineId: dl.purchaseOrderLineId,
      qtyDelivered: Number(dl.qtyDelivered),
      qtyAccepted: Number(dl.qtyAccepted),
      qtyRejected: Number(dl.qtyRejected),
    }));

    if (!d.voidedAt) {
      for (const l of lines) {
        const r =
          rollupByLine.get(l.lineId) ?? {
            delivered: 0,
            accepted: 0,
            rejected: 0,
          };
        r.delivered += l.qtyDelivered;
        r.accepted += l.qtyAccepted;
        r.rejected += l.qtyRejected;
        rollupByLine.set(l.lineId, r);
      }
    }

    const list = deliveriesByPo.get(d.purchaseOrderId) ?? [];
    list.push({
      id: d.id,
      deliveredOn: d.deliveredOn,
      noteNumber: d.noteNumber,
      siteNotes: d.siteNotes,
      overDeliveryReason: d.overDeliveryReason,
      voidedAt: iso(d.voidedAt),
      voidReason: d.voidReason,
      lines,
    });
    deliveriesByPo.set(d.purchaseOrderId, list);
  }

  const linesByPo = new Map<string, POMaterialLine[]>();
  for (const l of lineRows) {
    const r = rollupByLine.get(l.id) ?? {
      delivered: 0,
      accepted: 0,
      rejected: 0,
    };
    const list = linesByPo.get(l.purchaseOrderId) ?? [];
    list.push({
      id: l.id,
      seq: l.seq,
      item: l.item,
      description: l.description,
      unit: l.unit,
      qtyOrdered: Number(l.qtyOrdered),
      unitPrice: l.unitPrice,
      qtyDelivered: r.delivered,
      qtyAccepted: r.accepted,
      qtyRejected: r.rejected,
    });
    linesByPo.set(l.purchaseOrderId, list);
  }

  const paymentsByPo = new Map<string, PurchaseOrder["payments"]>();
  for (const p of paymentRows) {
    const list = paymentsByPo.get(p.purchaseOrderId) ?? [];
    list.push({
      id: p.id,
      paidOn: p.paidOn,
      amount: p.amount,
      method: PAYMENT_METHOD_LABELS[p.method] ?? "Other",
      reference: p.reference,
      kind: p.kind ? PAYMENT_KIND_LABELS[p.kind] ?? null : null,
      overPaymentReason: p.overPaymentReason,
      voidedAt: iso(p.voidedAt),
      voidReason: p.voidReason,
    });
    paymentsByPo.set(p.purchaseOrderId, list);
  }

  return poRows.map((r) => ({
    id: r.id,
    status: r.status,
    displayNumber: r.displayNumber,
    projectId: r.projectId,
    projectName: r.projectName,
    stageId: r.stageId,
    stageName: r.stageName,
    supplierId: r.supplierId,
    // The identity frozen at Issue wins; the live register name is the
    // fallback while the PO is still `planned` (ticket 09 §6).
    supplierName:
      r.documentSnapshot?.counterpartyName ??
      r.registerSupplierName ??
      "Unlinked supplier",
    expectedDeliveryOn: r.expectedDeliveryOn,
    paymentTerms: r.paymentTerms,
    notes: r.notes,
    supplierAckNote: r.supplierAckNote,
    supplierAckOn: r.supplierAckOn,
    cancelReason: r.cancelReason,
    orderedAt: iso(r.orderedAt),
    cancelledAt: iso(r.cancelledAt),
    closedAt: iso(r.closedAt),
    reopenedAt: iso(r.reopenedAt),
    lines: linesByPo.get(r.id) ?? [],
    deliveries: deliveriesByPo.get(r.id) ?? [],
    payments: paymentsByPo.get(r.id) ?? [],
  }));
}

/** Every Purchase Order for a project, oldest first — the procurement list. */
export async function listPurchaseOrders(
  projectId: string,
): Promise<PurchaseOrder[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(poSelection)
      .from(purchaseOrders)
      .innerJoin(stages, eq(stages.id, purchaseOrders.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(purchaseOrders.createdAt))) as PoRow[];

    return assemble(tx, rows);
  });
}

/** One Purchase Order by opaque id, or `null` (missing or cross-account). */
export async function getPurchaseOrder(
  poId: string,
): Promise<PurchaseOrder | null> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(poSelection)
      .from(purchaseOrders)
      .innerJoin(stages, eq(stages.id, purchaseOrders.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(eq(purchaseOrders.id, poId))
      .limit(1)) as PoRow[];

    const [po] = await assemble(tx, rows);
    return po ?? null;
  });
}
