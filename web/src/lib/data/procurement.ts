import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type {
  DeliveryRecord,
  PaymentMethod,
  POMaterialLine,
  PurchaseOrder,
  SupplierPaymentKind,
} from "@/lib/procurement";
import type {
  DeliveryInput,
  PaymentInput,
  POLineInput,
  PurchaseOrderDraftInput,
  SupplierAckInput,
} from "@/lib/validation/procurement";

import { getCurrentAccountId } from "./account-context";
import { claimDocumentNumber, pad3 } from "./document-numbers";
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
import type { DocumentSnapshot, DocumentSnapshotSection } from "./schema/snapshot";
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
      (r.supplierId == null ? "Supplier not chosen" : "Unlinked supplier"),
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

/**
 * The write side of the Purchase Order DAL (multi-tenancy ticket 08 §3, state
 * machine ticket 09 §2/§3) — Slice 2.6.
 *
 * Same rule as the read side and the Funding Request DAL: no `accountId` in any
 * signature. `withAccount` sets the tenant GUC and Postgres RLS (`WITH CHECK`)
 * is the backstop, so an insert only ever writes the caller's own row and a
 * cross-account update is a silent no-op — callers read the returned-rows count
 * (or a typed result) and 404 / no-op.
 *
 * "Issue" (`planned → ordered`) is the atomic line between editable and
 * immutable: it validates the supplier, mints `PO-{project}-NNN`, freezes
 * `document_snapshot` (supplier identity, terms, lines) and sets `ordered_at`.
 * After `ordered` the only writes are *appending* Delivery / Payment records
 * (append-only with reversal — a correction is a void + a fresh row) or the
 * terminal `cancel` / `close` / `reopen`. `supplier_id` stays a loose column,
 * so this DAL asserts it points at a live supplier in the Account.
 */

const EPSILON = 1e-9;

async function supplierIsValid(
  tx: AccountTx,
  supplierId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  return Boolean(row);
}

export async function insertPoLines(
  tx: AccountTx,
  accountId: string,
  purchaseOrderId: string,
  lines: POLineInput[],
): Promise<void> {
  if (lines.length === 0) return;
  await tx.insert(purchaseOrderLines).values(
    lines.map((line, i) => ({
      accountId,
      purchaseOrderId,
      seq: i + 1,
      item: line.item,
      description: line.description ?? null,
      unit: line.unit,
      qtyOrdered: String(line.qtyOrdered),
      unitPrice: line.unitPrice,
    })),
  );
}

// --- Draft create / edit ------------------------------------------------

/**
 * Create a Draft (planned) Purchase Order under a stage. Returns the new order
 * id, or `null` when the stage is missing / cross-account or the chosen
 * supplier is not in the Account.
 */
export async function createPurchaseOrderDraft(
  stageId: string,
  input: PurchaseOrderDraftInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;
    if (!(await supplierIsValid(tx, input.supplierId))) return null;

    const [row] = await tx
      .insert(purchaseOrders)
      .values({
        accountId,
        stageId,
        supplierId: input.supplierId,
        status: "planned",
        expectedDeliveryOn: input.expectedDeliveryOn ?? null,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: purchaseOrders.id });

    await insertPoLines(tx, accountId, row.id, input.lines);
    return row.id;
  });
}

/** The editable body of a Draft, form-shaped, or `null` (missing / not planned). */
export async function getPurchaseOrderDraftInput(poId: string): Promise<
  | {
      projectId: string;
      stageId: string;
      stageName: string;
      /** Unset on a draft raised from a Task — the Engineer picks one here. */
      supplierId: string | undefined;
      /** The Task this draft was raised from, when a Task save created it. */
      sourceTaskId: string | undefined;
      expectedDeliveryOn: string | undefined;
      paymentTerms: string | undefined;
      notes: string | undefined;
      lines: {
        item: string;
        description: string | undefined;
        unit: string;
        qtyOrdered: number;
        unitPrice: number;
      }[];
    }
  | null
> {
  return withAccount(async (tx) => {
    const [row] = (await tx
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        stageId: purchaseOrders.stageId,
        stageName: stages.name,
        projectId: stages.projectId,
        supplierId: purchaseOrders.supplierId,
        sourceTaskId: purchaseOrders.sourceTaskId,
        expectedDeliveryOn: purchaseOrders.expectedDeliveryOn,
        paymentTerms: purchaseOrders.paymentTerms,
        notes: purchaseOrders.notes,
      })
      .from(purchaseOrders)
      .innerJoin(stages, eq(stages.id, purchaseOrders.stageId))
      .where(eq(purchaseOrders.id, poId))
      .limit(1)) as {
      id: string;
      status: PurchaseOrder["status"];
      stageId: string;
      stageName: string;
      projectId: string;
      supplierId: string | null;
      sourceTaskId: string | null;
      expectedDeliveryOn: string | null;
      paymentTerms: string | null;
      notes: string | null;
    }[];
    if (!row || row.status !== "planned") return null;

    const lineRows = await tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId))
      .orderBy(asc(purchaseOrderLines.seq));

    return {
      projectId: row.projectId,
      stageId: row.stageId,
      stageName: row.stageName,
      supplierId: row.supplierId ?? undefined,
      sourceTaskId: row.sourceTaskId ?? undefined,
      expectedDeliveryOn: row.expectedDeliveryOn ?? undefined,
      paymentTerms: row.paymentTerms ?? undefined,
      notes: row.notes ?? undefined,
      lines: lineRows.map((l) => ({
        item: l.item,
        description: l.description ?? undefined,
        unit: l.unit,
        qtyOrdered: Number(l.qtyOrdered),
        unitPrice: l.unitPrice,
      })),
    };
  });
}

/**
 * Replace a Draft's body. Lines are deleted and re-inserted — a planned order is
 * freely editable and nothing downstream depends on a planned line. `false` when
 * the id is missing, cross-account, no longer planned, or the chosen supplier is
 * not in the Account.
 */
export async function updatePurchaseOrderDraft(
  poId: string,
  input: PurchaseOrderDraftInput,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);
    if (!row || row.status !== "planned") return false;
    if (!(await supplierIsValid(tx, input.supplierId))) return false;

    await tx
      .update(purchaseOrders)
      .set({
        supplierId: input.supplierId,
        expectedDeliveryOn: input.expectedDeliveryOn ?? null,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId));

    await tx
      .delete(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId));
    await insertPoLines(tx, accountId, poId, input.lines);
    return true;
  });
}

/** Discard a Draft (cascades its lines). `false` when missing / not planned. */
export async function deletePurchaseOrderDraft(poId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(purchaseOrders)
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.status, "planned")),
      )
      .returning({ id: purchaseOrders.id });
    return res.length > 0;
  });
}

// --- Issue -----------------------------------------------------------

export type POIssueResult =
  | { ok: true; displayNumber: string }
  | { ok: false; reason: "not-found" | "not-draft" | "no-lines" | "supplier-missing" };

/**
 * The atomic Issue transaction (`planned → ordered`, ticket 09 §2). Validates
 * the supplier, mints `PO-{project}-NNN`, freezes `document_snapshot` (supplier
 * identity, terms and lines) and sets `ordered_at`. After this the lines and
 * unit prices are immutable — a real change is cancel-and-reissue (ADR 0003).
 */
export async function issuePurchaseOrder(poId: string): Promise<POIssueResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [po] = (await tx
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        stageId: purchaseOrders.stageId,
        stageName: stages.name,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        expectedDeliveryOn: purchaseOrders.expectedDeliveryOn,
        paymentTerms: purchaseOrders.paymentTerms,
        notes: purchaseOrders.notes,
        projectId: stages.projectId,
        projectCode: projects.projectCode,
        projectName: projects.name,
        site: projects.site,
      })
      .from(purchaseOrders)
      .innerJoin(stages, eq(stages.id, purchaseOrders.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(eq(purchaseOrders.id, poId))
      .limit(1)) as {
      id: string;
      status: PurchaseOrder["status"];
      stageId: string;
      stageName: string;
      supplierId: string | null;
      supplierName: string | null;
      supplierPhone: string | null;
      expectedDeliveryOn: string | null;
      paymentTerms: string | null;
      notes: string | null;
      projectId: string;
      projectCode: string;
      projectName: string;
      site: string;
    }[];

    if (!po) return { ok: false as const, reason: "not-found" as const };
    if (po.status !== "planned")
      return { ok: false as const, reason: "not-draft" as const };
    if (!po.supplierId || !po.supplierName)
      return { ok: false as const, reason: "supplier-missing" as const };

    const lineRows = await tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId))
      .orderBy(asc(purchaseOrderLines.seq));
    if (lineRows.length === 0)
      return { ok: false as const, reason: "no-lines" as const };

    const base = await claimDocumentNumber(
      tx,
      accountId,
      po.projectId,
      "purchase_order",
    );
    const displayNumber = `PO-${po.projectCode}-${pad3(base)}`;
    const issuedOn = new Date().toISOString().slice(0, 10);

    const section: DocumentSnapshotSection = {
      title: "Material lines",
      lines: lineRows.map((l) => ({
        label: l.item,
        description: l.description ?? undefined,
        qty: String(Number(l.qtyOrdered)),
        unit: l.unit,
        unitCost: l.unitPrice,
        amount: Number(l.qtyOrdered) * l.unitPrice,
      })),
      subtotal: lineRows.reduce(
        (sum, l) => sum + Number(l.qtyOrdered) * l.unitPrice,
        0,
      ),
    };

    const snapshot: DocumentSnapshot = {
      kind: "purchase_order",
      displayNumber,
      issuedOn,
      projectName: po.projectName,
      projectCode: po.projectCode,
      counterpartyName: po.supplierName,
      supplierContact: po.supplierPhone ?? undefined,
      expectedDeliveryOn: po.expectedDeliveryOn ?? undefined,
      site: po.site,
      stageName: po.stageName,
      sections: [section],
      total: section.subtotal,
      notes: po.notes ?? undefined,
      paymentInstructions: po.paymentTerms ?? undefined,
    };

    await tx
      .update(purchaseOrders)
      .set({
        status: "ordered",
        baseNumber: base,
        displayNumber,
        documentSnapshot: snapshot,
        orderedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId));

    return { ok: true as const, displayNumber };
  });
}

// --- Delivery records -------------------------------------------------

export type DeliveryResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not-found" | "not-ordered" | "unknown-line" | "over-delivery";
    };

/**
 * Append a Delivery record against an ordered Purchase Order (ticket 09 §3;
 * guidelines §23). Never edits an existing record — a correction is a void plus
 * a fresh record. A delivery that takes a line past its ordered quantity is
 * allowed only with an `overDeliveryReason` (§42.12).
 */
export async function recordDelivery(
  poId: string,
  input: DeliveryInput,
): Promise<DeliveryResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [po] = await tx
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);
    if (!po) return { ok: false as const, reason: "not-found" as const };
    if (po.status !== "ordered")
      return { ok: false as const, reason: "not-ordered" as const };

    const lineRows = await tx
      .select({
        id: purchaseOrderLines.id,
        qtyOrdered: purchaseOrderLines.qtyOrdered,
      })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId));
    const orderedByLine = new Map(
      lineRows.map((l) => [l.id, Number(l.qtyOrdered)]),
    );

    const entered = input.lines.filter(
      (l) => l.qtyDelivered > 0 || l.qtyAccepted > 0 || l.qtyRejected > 0,
    );
    if (entered.some((l) => !orderedByLine.has(l.lineId)))
      return { ok: false as const, reason: "unknown-line" as const };

    const priorRows = (
      await tx.execute<{ line_id: string; delivered: string }>(sql`
        SELECT drl.purchase_order_line_id AS line_id,
               COALESCE(SUM(drl.qty_delivered), 0) AS delivered
          FROM delivery_record_lines drl
          JOIN delivery_records dr ON dr.id = drl.delivery_record_id
         WHERE dr.purchase_order_id = ${poId} AND dr.voided_at IS NULL
         GROUP BY drl.purchase_order_line_id
      `)
    ).rows;
    const priorByLine = new Map(
      priorRows.map((r) => [r.line_id, Number(r.delivered)]),
    );

    const overDelivers = entered.some((l) => {
      const prior = priorByLine.get(l.lineId) ?? 0;
      const ordered = orderedByLine.get(l.lineId) ?? 0;
      return prior + l.qtyDelivered > ordered + EPSILON;
    });
    if (overDelivers && !input.overDeliveryReason)
      return { ok: false as const, reason: "over-delivery" as const };

    const [record] = await tx
      .insert(deliveryRecords)
      .values({
        accountId,
        purchaseOrderId: poId,
        deliveredOn: input.deliveredOn,
        noteNumber: input.noteNumber ?? null,
        siteNotes: input.siteNotes ?? null,
        overDeliveryReason: overDelivers
          ? (input.overDeliveryReason ?? null)
          : null,
      })
      .returning({ id: deliveryRecords.id });

    await tx.insert(deliveryRecordLines).values(
      entered.map((l) => ({
        accountId,
        deliveryRecordId: record.id,
        purchaseOrderLineId: l.lineId,
        qtyDelivered: String(l.qtyDelivered),
        qtyAccepted: String(l.qtyAccepted),
        qtyRejected: String(l.qtyRejected),
      })),
    );

    return { ok: true as const };
  });
}

/** Void a Delivery record (append-only with reversal, ticket 09 §3). `false` when missing. */
export async function voidDelivery(
  poId: string,
  deliveryId: string,
  reason: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(deliveryRecords)
      .set({ voidedAt: new Date(), voidReason: reason, updatedAt: new Date() })
      .where(
        and(
          eq(deliveryRecords.id, deliveryId),
          eq(deliveryRecords.purchaseOrderId, poId),
          sql`${deliveryRecords.voidedAt} IS NULL`,
        ),
      )
      .returning({ id: deliveryRecords.id });
    return res.length > 0;
  });
}

// --- Supplier payments ----------------------------------------------

export type PaymentResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-ordered" | "over-payment" };

/**
 * Append a Supplier Payment against an ordered Purchase Order (ticket 09 §3;
 * guidelines §24). Append-only with reversal. A payment that takes the paid
 * total past the ordered total is allowed only with an `overPaymentReason`
 * (§42.6); `paid > ordered` shows as a negative Outstanding (a supplier credit).
 */
export async function recordPayment(
  poId: string,
  input: PaymentInput,
): Promise<PaymentResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [po] = await tx
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);
    if (!po) return { ok: false as const, reason: "not-found" as const };
    if (po.status !== "ordered")
      return { ok: false as const, reason: "not-ordered" as const };

    const { rows } = await tx.execute<{ ordered_total: string; paid_total: string }>(sql`
      SELECT
        COALESCE((SELECT SUM(l.qty_ordered * l.unit_price)
                    FROM purchase_order_lines l
                   WHERE l.purchase_order_id = ${poId}), 0) AS ordered_total,
        COALESCE((SELECT SUM(p.amount)
                    FROM payment_records p
                   WHERE p.purchase_order_id = ${poId} AND p.voided_at IS NULL), 0) AS paid_total
    `);
    const orderedTotalValue = Number(rows[0]?.ordered_total ?? 0);
    const paidSoFar = Number(rows[0]?.paid_total ?? 0);

    const overPays = paidSoFar + input.amount > orderedTotalValue + EPSILON;
    if (overPays && !input.overPaymentReason)
      return { ok: false as const, reason: "over-payment" as const };

    await tx.insert(paymentRecords).values({
      accountId,
      purchaseOrderId: poId,
      paidOn: input.paidOn,
      amount: input.amount,
      method: input.method,
      kind: input.kind ?? null,
      reference: input.reference ?? null,
      overPaymentReason: overPays ? (input.overPaymentReason ?? null) : null,
    });

    return { ok: true as const };
  });
}

/** Void a Supplier Payment (append-only with reversal, ticket 09 §3). `false` when missing. */
export async function voidPayment(
  poId: string,
  paymentId: string,
  reason: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(paymentRecords)
      .set({ voidedAt: new Date(), voidReason: reason, updatedAt: new Date() })
      .where(
        and(
          eq(paymentRecords.id, paymentId),
          eq(paymentRecords.purchaseOrderId, poId),
          sql`${paymentRecords.voidedAt} IS NULL`,
        ),
      )
      .returning({ id: paymentRecords.id });
    return res.length > 0;
  });
}

// --- Terminal transitions -----------------------------------------

/** Cancel an ordered Purchase Order (ADR 0003 — a real change is cancel-and-reissue). */
export async function cancelPurchaseOrder(
  poId: string,
  reason: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(purchaseOrders)
      .set({
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.status, "ordered")),
      )
      .returning({ id: purchaseOrders.id });
    return res.length > 0;
  });
}

/** Close an ordered Purchase Order — its float exposure drops to paid-only (ticket 09 §4). */
export async function closePurchaseOrder(poId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(purchaseOrders)
      .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.status, "ordered")),
      )
      .returning({ id: purchaseOrders.id });
    return res.length > 0;
  });
}

/** Reopen a closed Purchase Order, available until the stage is closed out (§42.14). */
export async function reopenPurchaseOrder(poId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(purchaseOrders)
      .set({ status: "ordered", reopenedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.status, "closed")),
      )
      .returning({ id: purchaseOrders.id });
    return res.length > 0;
  });
}

/** Record a supplier's acknowledgement of the order — a dated note, not a gate (ticket 09 §2). */
export async function recordSupplierAck(
  poId: string,
  input: SupplierAckInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(purchaseOrders)
      .set({
        supplierAckNote: input.supplierAckNote,
        supplierAckOn:
          input.supplierAckOn ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(purchaseOrders.id, poId),
          inArray(purchaseOrders.status, ["ordered", "closed"]),
        ),
      )
      .returning({ id: purchaseOrders.id });
    return res.length > 0;
  });
}
