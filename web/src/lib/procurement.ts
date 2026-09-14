/**
 * The Purchase Order domain — types and pure helpers, promoted out of the
 * retired `procurement-mock.ts` (multi-tenancy ticket 08 §5) and corrected to
 * the ticket 09 §2/§3 vocabulary.
 *
 * This module has no data access — it is safe to import from client components.
 * The read side of the DAL lives in `@/lib/data/procurement.ts` and returns the
 * `PurchaseOrder` view-model defined here, with the delivered / accepted /
 * rejected quantities already rolled up per line from the non-voided delivery
 * records. Nothing here reads or writes `status`: `status` carries only the
 * stored lifecycle bits (`planned → ordered`, plus terminal `cancelled` /
 * `closed`); the `Partially Delivered` / `Delivered` / `Partially Paid` /
 * `Paid` sub-states are always derived by `derivePOStatus`.
 */

/** The stored lifecycle bits — the `purchase_order_status` enum. */
export type POStoredStatus = "planned" | "ordered" | "cancelled" | "closed";

/**
 * The Commitment State a Purchase Order displays in (CONTEXT.md "Commitment
 * State"; ticket 09 §2). `Planned` and the terminal states come straight from
 * the stored `status`; the middle four are read off the delivery and payment
 * records. `Confirmed` and `Issued` from the old mock are gone — a supplier
 * acknowledgement is a dated note, not a state.
 */
export type POStatus =
  | "Planned"
  | "Ordered"
  | "Partially Delivered"
  | "Delivered"
  | "Partially Paid"
  | "Paid"
  | "Cancelled"
  | "Closed";

/** How a Supplier Payment moved — the display form of the `payment_method` enum. */
export type PaymentMethod =
  | "Bank Transfer"
  | "Cash"
  | "Mobile Money"
  | "Cheque"
  | "Other";

/** The display form of the `supplier_payment_kind` enum. */
export type SupplierPaymentKind = "Deposit" | "Partial" | "Final";

export interface POMaterialLine {
  id: string;
  seq: number;
  item: string;
  description: string | null;
  unit: string;
  qtyOrdered: number;
  unitPrice: number;
  /**
   * Rolled up by the DAL from the non-voided `delivery_record_lines` for this
   * line — never a stored column (Ordered ≠ Delivered ≠ Accepted, §23).
   */
  qtyDelivered: number;
  qtyAccepted: number;
  qtyRejected: number;
}

export interface DeliveryRecordLine {
  lineId: string;
  qtyDelivered: number;
  qtyAccepted: number;
  qtyRejected: number;
}

export interface DeliveryRecord {
  id: string;
  deliveredOn: string;
  noteNumber: string | null;
  siteNotes: string | null;
  /** Set when the delivery took a line past its ordered quantity (§42.12). */
  overDeliveryReason: string | null;
  /** Append-only with reversal (ticket 09 §3): a voided record is kept, marked. */
  voidedAt: string | null;
  voidReason: string | null;
  lines: DeliveryRecordLine[];
}

export interface PaymentRecord {
  id: string;
  paidOn: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  kind: SupplierPaymentKind | null;
  /** Set when the payment took the paid total past the ordered total (§42.6). */
  overPaymentReason: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

/**
 * The nested read view-model for one Purchase Order. `deliveries` and `payments`
 * carry every record including voided ones (the screen marks them); every
 * derived figure below ignores voided rows.
 */
export interface PurchaseOrder {
  id: string;
  status: POStoredStatus;
  /** `null` while `planned` — a Draft displays as "Draft" with no number. */
  displayNumber: string | null;

  projectId: string;
  projectName: string;
  stageId: string;
  stageName: string;

  /** The register cross-reference; a loose column, may be `null` if unlinked. */
  supplierId: string | null;
  /** Frozen into the document snapshot at Issue; the register's current name otherwise. */
  supplierName: string;

  expectedDeliveryOn: string | null;
  paymentTerms: string | null;
  notes: string | null;

  supplierAckNote: string | null;
  supplierAckOn: string | null;
  cancelReason: string | null;

  orderedAt: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;

  lines: POMaterialLine[];
  deliveries: DeliveryRecord[];
  payments: PaymentRecord[];
}

// --- Pure derivations (ticket 09 §3; guidelines §51 "one calculation path"). --

/** Σ ordered quantity × unit price over every line. */
export function orderedTotal(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitPrice, 0);
}

/** Σ accepted quantity × unit price — the value actually taken into store. */
export function acceptedValue(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + l.qtyAccepted * l.unitPrice, 0);
}

/** Σ non-voided payments. */
export function paidTotal(po: PurchaseOrder): number {
  return po.payments.reduce(
    (sum, p) => (p.voidedAt ? sum : sum + p.amount),
    0,
  );
}

/**
 * Ordered total − paid total. Negative when the supplier has been overpaid
 * (a supplier credit — the commitment itself floors at 0, ticket 09 §3).
 */
export function outstandingValue(po: PurchaseOrder): number {
  return orderedTotal(po) - paidTotal(po);
}

/**
 * The single source for a PO's Commitment State (ticket 09 §3). Computed from
 * the stored `status` plus the rolled-up line quantities and non-voided
 * payments — nothing writes a status directly.
 */
export function derivePOStatus(po: PurchaseOrder): POStatus {
  if (po.status === "cancelled") return "Cancelled";
  if (po.status === "closed") return "Closed";
  if (po.status === "planned") return "Planned";

  // `ordered` — read the middle states off the child records.
  const ordered = orderedTotal(po);
  const paid = paidTotal(po);

  if (ordered > 0 && paid >= ordered) return "Paid";
  if (paid > 0) return "Partially Paid";

  const hasLines = po.lines.length > 0;
  if (hasLines && po.lines.every((l) => l.qtyAccepted >= l.qtyOrdered)) {
    return "Delivered";
  }
  if (po.lines.some((l) => l.qtyAccepted > 0)) return "Partially Delivered";

  return "Ordered";
}
