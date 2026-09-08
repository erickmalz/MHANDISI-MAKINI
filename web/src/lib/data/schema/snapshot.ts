/**
 * The frozen content an Issued Funding Request, Fee Invoice or Purchase Order
 * renders from (multi-tenancy ticket 09 §6, ticket 10 §3).
 *
 * Written once, in the atomic Issue transaction, into the `document_snapshot`
 * JSONB column. The renderer reads *only* this for transactional content — never
 * the live `projects` / `suppliers` / `*_lines` tables — so a later register
 * edit or a `finance.ts` change can never rewrite a document that was already
 * issued. The letterhead (the Engineer's own business name, phone, logo) is the
 * one exception: it renders from the current Account profile, not from here.
 *
 * This is the loose shape the schema commits to now; the document-rendering
 * slice (ticket 10) fills in the exact per-type fields.
 */

export interface DocumentSnapshotLine {
  label: string;
  description?: string;
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

export interface DocumentSnapshot {
  kind: "funding_request" | "fee_invoice" | "purchase_order";
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
  /** Present on a superseding Funding Request version. */
  supersedes?: { displayNumber: string; reason: string };
}
