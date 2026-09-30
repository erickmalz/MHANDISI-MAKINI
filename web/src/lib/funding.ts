/**
 * The Funding Request domain — types and pure helpers, promoted out of the
 * retired `funding-mock.ts` (multi-tenancy ticket 08 §5) and extended by
 * Slice 2.5 with the full read view-model + derivations.
 *
 * A stage's material and labour lines are entered directly on the Funding
 * Request in v1 — the separate take-off / labour-agreement module stays
 * deferred (ticket 08 §2). No data access here; safe to import from client
 * components. The write side lives in `@/lib/data/funding.ts` and the read side
 * returns the `FundingRequest` view-model defined below.
 *
 * The state machine is fixed by multi-tenancy ticket 09 §1: `Draft` is the only
 * editable state; **Issue** freezes the number, lines and totals permanently
 * and raises the stage's Fee Invoice; a correction forks a new version that
 * Supersedes the old one; an Additional Funding Request is a separate request,
 * never a version. Deposit progress is always derived from the Deposit records.
 */

// --- Worksheet types (unchanged from Slice 2.3) -----------------------------

export interface MaterialLine {
  item: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface LabourLine {
  subcontractor: string;
  amount: number;
}

export interface TaskLine {
  id: string;
  name: string;
  material: MaterialLine[];
  labour: LabourLine[];
}

/** Σ material line cost for a task. */
export function materialTotal(t: TaskLine): number {
  return t.material.reduce((sum, m) => sum + m.qty * m.unitCost, 0);
}

/** Σ labour line amount for a task. */
export function labourTotal(t: TaskLine): number {
  return t.labour.reduce((sum, l) => sum + l.amount, 0);
}

// --- Read view-model (Slice 2.5) -------------------------------------------

/** The stored lifecycle bits — the `funding_request_status` enum. */
export type FRStoredStatus =
  | "draft"
  | "issued"
  | "superseded"
  | "cancelled"
  | "closed";

/** The `funding_request_kind` enum. */
export type FRKind = "base" | "additional";

/** The `funding_line_category` enum. */
export type FundingLineCategory = "material" | "labour" | "fee" | "other";

/** How a Deposit moved — the display form of the `payment_method` enum. */
export type PaymentMethod =
  | "Bank Transfer"
  | "Cash"
  | "Mobile Money"
  | "Cheque"
  | "Other";

/**
 * The Commitment / deposit state a Funding Request displays in (CONTEXT.md
 * "Funding Request"; ticket 09 §1). `Draft` and the terminal states come from
 * the stored `status`; `Partially Deposited` / `Deposited` are read off the
 * non-voided Deposit records against an Issued request.
 */
export type FRStatus =
  | "Draft"
  | "Issued"
  | "Partially Deposited"
  | "Deposited"
  | "Superseded"
  | "Cancelled"
  | "Closed";

export interface FundingRequestLine {
  id: string;
  category: FundingLineCategory;
  seq: number;
  item: string;
  description: string | null;
  /** Present on a quantified material line; `null` on a lump-sum line. */
  qty: number | null;
  unit: string | null;
  unitCost: number | null;
  /** The line total — stored, so a lump-sum line with no qty is representable. */
  amount: number;
}

export interface Deposit {
  id: string;
  amount: number;
  receivedOn: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  /** Append-only with reversal (ticket 09 §1): a voided deposit is kept, marked. */
  voidedAt: string | null;
  voidReason: string | null;
}

/** The Fee Invoice raised by this request's Issue (ticket 09 §1). */
export interface FundingRequestFeeInvoice {
  id: string;
  displayNumber: string;
  status: "issued" | "paid" | "void";
  feeAmount: number;
  /** Sum of payments so far — between 0 and `feeAmount` while `issued`. */
  amountReceived: number;
  isDelta: boolean;
}

/**
 * The nested read view-model for one Funding Request. `deposits` carries every
 * record including voided ones (the screen marks them); every derived figure
 * below ignores voided rows.
 */
export interface FundingRequest {
  id: string;
  kind: FRKind;
  status: FRStoredStatus;
  version: number;
  /** `null` while `draft` — a Draft displays as "Draft" with no number. */
  baseNumber: number | null;
  displayNumber: string | null;

  projectId: string;
  projectCode: string;
  projectName: string;
  stageId: string;
  stageName: string;
  clientName: string;
  site: string;

  /** The request this one replaced, and (when known) its frozen number. */
  supersedesId: string | null;
  supersedesDisplayNumber: string | null;
  /** The later version that replaced this one, when it has been superseded. */
  supersededByDisplayNumber: string | null;
  revisionReason: string | null;
  cancelReason: string | null;

  notes: string | null;
  paymentInstructions: string | null;

  issuedAt: string | null;

  lines: FundingRequestLine[];
  deposits: Deposit[];
  feeInvoice: FundingRequestFeeInvoice | null;
}

// --- Pure derivations (guidelines §51 "one calculation path") --------------

const byCategory =
  (category: FundingLineCategory) =>
  (fr: Pick<FundingRequest, "lines">): number =>
    fr.lines
      .filter((l) => l.category === category)
      .reduce((sum, l) => sum + l.amount, 0);

/** Σ material lines. */
export const materialSubtotal = byCategory("material");
/** Σ labour lines. */
export const labourSubtotal = byCategory("labour");
/** Σ fee lines (added at Issue, from the stage's fee basis). */
export const feeSubtotal = byCategory("fee");
/** Σ other lines. */
export const otherSubtotal = byCategory("other");

/**
 * What the client is asked to deposit against this request: material + labour +
 * other. The supervision fee is billed through the Fee Invoice and is shown on
 * the document for transparency only — it is never collected through the
 * deposit flow (CONTEXT.md "Fee Invoice").
 */
export function depositTarget(fr: Pick<FundingRequest, "lines">): number {
  return materialSubtotal(fr) + labourSubtotal(fr) + otherSubtotal(fr);
}

/** The full document total — deposit target plus the fee line shown for transparency. */
export function documentTotal(fr: Pick<FundingRequest, "lines">): number {
  return depositTarget(fr) + feeSubtotal(fr);
}

/** Σ non-voided deposits recorded against this request. */
export function depositedTotal(fr: Pick<FundingRequest, "deposits">): number {
  return fr.deposits.reduce((sum, d) => (d.voidedAt ? sum : sum + d.amount), 0);
}

/** Deposit target − deposited so far, floored at 0. */
export function depositOutstanding(
  fr: Pick<FundingRequest, "lines" | "deposits">,
): number {
  return Math.max(0, depositTarget(fr) - depositedTotal(fr));
}

/**
 * The single source for a Funding Request's display status (ticket 09 §1).
 * Stored `draft` / `superseded` / `cancelled` / `closed` pass straight through;
 * an `issued` request resolves to a deposit sub-state from its non-voided
 * Deposit records.
 */
export function deriveFRStatus(
  fr: Pick<FundingRequest, "status" | "lines" | "deposits">,
): FRStatus {
  if (fr.status === "draft") return "Draft";
  if (fr.status === "superseded") return "Superseded";
  if (fr.status === "cancelled") return "Cancelled";
  if (fr.status === "closed") return "Closed";

  const target = depositTarget(fr);
  const deposited = depositedTotal(fr);
  if (deposited > 0 && target > 0 && deposited >= target) return "Deposited";
  if (deposited > 0) return "Partially Deposited";
  return "Issued";
}
