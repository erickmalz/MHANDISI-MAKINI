/**
 * The frozen content an Issued Funding Request, Fee Invoice or Purchase Order
 * renders from (multi-tenancy ticket 09 §6, ticket 10 §3).
 *
 * Written once, in the atomic Issue transaction, into the `document_snapshot`
 * JSONB column. The renderer reads *only* this for transactional content — never
 * the live `projects` / `suppliers` / `*_lines` tables — so a later register
 * edit or a `finance.ts` change can never rewrite a document that was already
 * issued. Two things are deliberately *not* in here:
 *
 *  - **The letterhead identity** (the Engineer's business name and phone). It
 *    renders from the current Account profile, because a corrected phone number
 *    is the Engineer representing themselves, not a term of the deal (§3).
 *  - **The lifecycle stamp** (`SUPERSEDED` / `CANCELLED` / `PAID — {date}`). The
 *    stamp reflects the record's state *now*, which changes after Issue, so the
 *    document getter derives it from the live row and passes it to the template
 *    alongside this snapshot.
 *
 * Slice 2.7 tightened this from the loose shape the schema first committed to
 * into a `kind`-discriminated union carrying every field ticket 10 §7 lists.
 */

export interface DocumentSnapshotLine {
  /** The line's name — a material item, a labour package, a fee description. */
  label: string;
  description?: string;
  /** Quantity as a display string (kept verbatim from entry, e.g. "12.5"). */
  qty?: string;
  unit?: string;
  unitCost?: number;
  amount: number;
}

export interface DocumentSnapshotSection {
  title: string;
  lines: DocumentSnapshotLine[];
  subtotal: number;
}

interface DocumentSnapshotBase {
  /** The frozen human-facing number, e.g. "FR-PRJ-2026-001-004 v2". */
  displayNumber: string;
  /** ISO date (YYYY-MM-DD) the record was Issued. */
  issuedOn: string;
  projectName: string;
  projectCode: string;
  /** Client (FR / Fee Invoice) or Supplier (PO) name, resolved at Issue. */
  counterpartyName: string;
  site: string;
  stageName: string;
  sections: DocumentSnapshotSection[];
  total: number;
  notes?: string;
  paymentInstructions?: string;
}

/**
 * A client-facing Funding Request. `total` is the **deposit target** (material +
 * labour + other); the supervision fee is a display-only section and is billed
 * through the Fee Invoice, never drawn from deposits (Phase 1 Fee Collection
 * Method).
 */
export interface FundingRequestSnapshot extends DocumentSnapshotBase {
  kind: "funding_request";
  /** The supervision fee shown on the request for transparency. */
  feeAmount: number;
  /** Present on a superseding version — the number it replaces and why. */
  supersedes?: { displayNumber: string; reason: string };
}

/**
 * A client-facing Fee Invoice. Raised inside the Funding Request Issue
 * transaction; `total` is the fee amount (or, for `isDelta`, only the increase).
 */
export interface FeeInvoiceSnapshot extends DocumentSnapshotBase {
  kind: "fee_invoice";
  /** The Funding Request version this fee is for, e.g. "FR-PRJ-2026-001-004 v2". */
  fundingRequestNumber: string;
  /** How the fee was worked out — the template composes the human sentence. */
  feeBasis: "fixed" | "percent";
  feePercent?: number;
  basisValue?: number;
  /** A follow-up invoice for the increase on a superseding version. */
  isDelta: boolean;
  /** When `isDelta`: the Fee Invoice number this one follows up. */
  parentNumber?: string;
}

/**
 * A supplier-facing Purchase Order — the order as issued, not a live tracker.
 * The Commitment State and delivered / paid progress are deliberately absent
 * (ticket 10 §7).
 */
export interface PurchaseOrderSnapshot extends DocumentSnapshotBase {
  kind: "purchase_order";
  /** Supplier phone frozen from the register at Issue, if the register had one. */
  supplierContact?: string;
  /** ISO date (YYYY-MM-DD), if an expected delivery date was set. */
  expectedDeliveryOn?: string;
}

export type DocumentSnapshot =
  | FundingRequestSnapshot
  | FeeInvoiceSnapshot
  | PurchaseOrderSnapshot;
