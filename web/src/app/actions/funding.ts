"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createFundingRequestDraft,
  deleteFundingRequestDraft,
  issueFundingRequest,
  linkVariationsToFundingRequest,
  correctFeeInvoice,
  recordDeposit,
  recordFeeInvoicePayment,
  supersedeFundingRequest,
  updateFundingRequestDraft,
  voidDeposit,
  voidFeeInvoice,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import {
  depositSchema,
  feeInvoiceCorrectionSchema,
  feeInvoicePaymentSchema,
  fundingRequestDraftSchema,
  supersedeSchema,
  voidReasonSchema,
} from "@/lib/validation/funding";

/**
 * Funding Request Server Actions (Slice 2.5). Every entry point re-scopes
 * through the DAL (`withAccount` + RLS); the project / stage / request ids
 * arrive as bound arguments, never from the form body. Ids in the URL are
 * opaque UUIDs (ticket 06).
 */

function revalidateFunding(projectId: string, frId?: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/funding`);
  if (frId) revalidatePath(`/projects/${projectId}/funding/${frId}`);
}

/** Parse the hidden `lines` JSON payload the builder posts. */
function readDraft(formData: FormData) {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = null;
  }
  return {
    notes: formData.get("notes") ?? undefined,
    paymentInstructions: formData.get("paymentInstructions") ?? undefined,
    lines,
  };
}

/**
 * The hidden `variationIds` JSON payload the create form posts when it was
 * opened from an Approved Variation's "Raise Additional Funding Request"
 * action (Phase 3 ticket 01 §4) — a purely informational link, never required.
 */
function readVariationIds(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(String(formData.get("variationIds") ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function createFundingRequestAction(
  projectId: string,
  kind: "base" | "additional",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const stageId = String(formData.get("stageId") ?? "");
  if (!stageId) return { error: "Choose the stage to fund." };

  const parsed = fundingRequestDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let frId: string | null;
  try {
    frId = await createFundingRequestDraft(stageId, kind, parsed.data);
  } catch {
    return { error: "Could not save the draft. Try again." };
  }
  if (!frId) return { error: "That stage could not be found." };

  const variationIds = readVariationIds(formData);
  if (kind === "additional" && variationIds.length > 0) {
    try {
      await linkVariationsToFundingRequest(frId, variationIds);
    } catch {
      // Purely informational — the draft itself already saved successfully.
    }
  }

  revalidateFunding(projectId);
  redirect(`/projects/${projectId}/funding/${frId}`);
}

export async function updateFundingRequestAction(
  projectId: string,
  frId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fundingRequestDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updateFundingRequestDraft(frId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok) return { error: "This draft could not be found, or is already issued." };

  revalidateFunding(projectId, frId);
  redirect(`/projects/${projectId}/funding/${frId}`);
}

export async function deleteFundingRequestDraftAction(
  projectId: string,
  frId: string,
): Promise<void> {
  const ok = await deleteFundingRequestDraft(frId);
  if (ok) {
    revalidateFunding(projectId, frId);
    redirect(`/projects/${projectId}/funding`);
  }
  redirect(`/projects/${projectId}/funding/${frId}`);
}

const ISSUE_ERRORS: Record<string, string> = {
  "not-found": "This request could not be found.",
  "not-draft": "This request has already been issued.",
  "no-lines": "Add at least one material or labour line before issuing.",
  "fee-basis-missing":
    "Set this stage's supervision fee basis (and amount or percentage) before issuing.",
};

/**
 * Issue is a plain form action (no `useActionState`): on failure it redirects
 * back to the draft with an `issue_error` query param the detail page surfaces.
 */
export async function issueFundingRequestAction(
  projectId: string,
  frId: string,
): Promise<void> {
  const base = `/projects/${projectId}/funding/${frId}`;
  let result: Awaited<ReturnType<typeof issueFundingRequest>>;
  try {
    result = await issueFundingRequest(frId);
  } catch {
    redirect(`${base}?issue_error=${encodeURIComponent("Could not issue the request. Try again.")}`);
  }
  if (!result.ok) {
    const message = ISSUE_ERRORS[result.reason] ?? "Could not issue.";
    redirect(`${base}?issue_error=${encodeURIComponent(message)}`);
  }

  revalidateFunding(projectId, frId);
  redirect(base);
}

export async function supersedeFundingRequestAction(
  projectId: string,
  frId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supersedeSchema.safeParse({
    revisionReason: formData.get("revisionReason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let newId: string | null;
  try {
    newId = await supersedeFundingRequest(frId, parsed.data);
  } catch {
    return { error: "Could not start a revision. Try again." };
  }
  if (!newId)
    return { error: "Only an issued request that has no later version can be revised." };

  revalidateFunding(projectId, frId);
  redirect(`/projects/${projectId}/funding/${newId}/edit`);
}

export async function recordDepositAction(
  projectId: string,
  frId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = depositSchema.safeParse({
    amount: formData.get("amount") ?? undefined,
    receivedOn: formData.get("receivedOn") ?? undefined,
    method: formData.get("method") ?? undefined,
    reference: formData.get("reference") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await recordDeposit(frId, parsed.data);
  } catch {
    return { error: "Could not record the deposit. Try again." };
  }
  if (!ok) return { error: "Deposits can only be recorded against an issued request." };

  revalidateFunding(projectId, frId);
  redirect(`/projects/${projectId}/funding/${frId}`);
}

export async function voidDepositAction(
  projectId: string,
  frId: string,
  depositId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidReasonSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await voidDeposit(frId, depositId, parsed.data.reason);
  } catch {
    return { error: "Could not void the deposit. Try again." };
  }
  if (!ok) return { error: "That deposit could not be found." };

  revalidateFunding(projectId, frId);
  redirect(`/projects/${projectId}/funding/${frId}`);
}

function revalidateFeeInvoice(projectId: string, feeInvoiceId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/funding`);
  revalidatePath(`/projects/${projectId}/fee-invoices`);
  revalidatePath(`/projects/${projectId}/fee-invoices/${feeInvoiceId}`);
}

/**
 * Record a full or part payment against an Issued Fee Invoice — the
 * supervisor's own ledger, separate from Deposits. Paying the whole balance
 * marks it paid.
 */
export async function recordFeeInvoicePaymentAction(
  projectId: string,
  feeInvoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = feeInvoicePaymentSchema.safeParse({
    amount: formData.get("amount") ?? undefined,
    receivedOn: formData.get("receivedOn") ?? undefined,
    method: formData.get("method") ?? undefined,
    reference: formData.get("reference") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let result;
  try {
    result = await recordFeeInvoicePayment(feeInvoiceId, parsed.data);
  } catch {
    return { error: "Could not record the payment. Try again." };
  }
  if (result === "not_found") return { error: "That Fee Invoice could not be found." };
  if (result === "not_open") return { error: "Only an unpaid Fee Invoice can take a payment." };
  if (result === "exceeds_balance") {
    return { fieldErrors: { amount: "That is more than the balance still owed." } };
  }

  revalidateFeeInvoice(projectId, feeInvoiceId);
  redirect(`/projects/${projectId}/fee-invoices/${feeInvoiceId}`);
}

/** Void an unpaid Fee Invoice raised in error — a recorded reason is required. */
export async function voidFeeInvoiceAction(
  projectId: string,
  feeInvoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidReasonSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await voidFeeInvoice(feeInvoiceId, parsed.data.reason);
  } catch {
    return { error: "Could not void the Fee Invoice. Try again." };
  }
  if (!ok) return { error: "Only an unpaid Fee Invoice with no payments can be voided." };

  revalidateFeeInvoice(projectId, feeInvoiceId);
  redirect(`/projects/${projectId}/fee-invoices/${feeInvoiceId}`);
}

/** Correct an unpaid Fee Invoice's amount — a recorded reason is required. */
export async function correctFeeInvoiceAction(
  projectId: string,
  feeInvoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = feeInvoiceCorrectionSchema.safeParse({
    amount: formData.get("amount") ?? undefined,
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await correctFeeInvoice(feeInvoiceId, parsed.data);
  } catch {
    return { error: "Could not correct the Fee Invoice. Try again." };
  }
  if (!ok) return { error: "Only an unpaid Fee Invoice with no payments can be corrected." };

  revalidateFeeInvoice(projectId, feeInvoiceId);
  redirect(`/projects/${projectId}/fee-invoices/${feeInvoiceId}`);
}
