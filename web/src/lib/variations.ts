/**
 * The Variation domain — view-model types and pure helpers, no data access,
 * safe to import from client components (Phase 3 Slice 3.1).
 *
 * A Variation is a formally logged scope change against exactly one Task
 * (guidelines §29; CONTEXT.md "Variation"). Its stored lifecycle is four
 * states, collapsed from the guidelines' eight
 * (`.scratch/phase3/issues/01-variation-module.md` §1): `Submitted` is dropped
 * (no client login — moving a Draft to Approved/Rejected *is* the decision
 * event), `Funded` is derived from `additional_funding_request_variations` +
 * the linked request's own status (never stored here), and `In Progress` /
 * `Completed` are dropped (tracked on the Task itself already).
 */

/** The `variation_status` enum. */
export type VariationStatus = "draft" | "approved" | "rejected" | "cancelled";

const VARIATION_STATUS_LABELS: Record<VariationStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function variationStatusLabel(status: VariationStatus): string {
  return VARIATION_STATUS_LABELS[status] ?? "Draft";
}

/** A Funding Request linked to a Variation via the join table (ticket 01 §4) — display only. */
export interface LinkedFundingRequest {
  id: string;
  displayNumber: string | null;
  status: string;
}

export interface Variation {
  id: string;
  stageId: string;
  stageName: string;
  projectId: string;
  taskId: string;
  taskDescription: string;

  status: VariationStatus;
  baseNumber: number | null;
  /** `VO-{project_code}-NNN` — `null` until Approve (ticket 01 §2). */
  displayNumber: string | null;

  description: string;
  reason: string | null;

  /** Signed whole-shilling amounts — a scope change can reduce as well as add. */
  materialImpact: number | null;
  labourImpact: number | null;
  /** A carried note only — no Fee Invoice is raised from this field (ticket 01 §5). */
  feeImpact: number | null;

  requestedAt: string;
  /** The client's real-world sign-off date, Engineer-entered — not a gate. */
  approvedAt: string | null;
  clientReference: string | null;
  notes: string | null;

  rejectedAt: string | null;
  cancelledAt: string | null;

  /** Additional Funding Requests this Variation has been manually linked to. */
  fundingRequestLinks: LinkedFundingRequest[];
}

/** Whether a Draft can still be edited or discarded. */
export function isVariationDraft(v: Pick<Variation, "status">): boolean {
  return v.status === "draft";
}

/**
 * "Funded" (ticket 01 §1) is derived, never stored: an Approved Variation
 * reads as funded once every linked request is `issued` or later (i.e. not
 * still a `draft`).
 */
export function isVariationFunded(v: Pick<Variation, "status" | "fundingRequestLinks">): boolean {
  if (v.status !== "approved") return false;
  if (v.fundingRequestLinks.length === 0) return false;
  return v.fundingRequestLinks.every((fr) => fr.status !== "draft");
}
