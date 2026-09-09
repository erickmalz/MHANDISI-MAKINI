"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrderDraft,
  deletePurchaseOrderDraft,
  issuePurchaseOrder,
  recordDelivery,
  recordPayment,
  recordSupplierAck,
  reopenPurchaseOrder,
  updatePurchaseOrderDraft,
  voidDelivery,
  voidPayment,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import {
  cancelSchema,
  deliverySchema,
  paymentSchema,
  purchaseOrderDraftSchema,
  supplierAckSchema,
  voidReasonSchema,
} from "@/lib/validation/procurement";

/**
 * Purchase Order Server Actions (Slice 2.6). Every entry point re-scopes through
 * the DAL (`withAccount` + RLS); the project / order / record ids arrive as
 * bound arguments, never from the form body. Ids in the URL are opaque UUIDs
 * (ticket 06).
 */

function revalidatePO(projectId: string, poId?: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/procurement`);
  if (poId) revalidatePath(`/projects/${projectId}/procurement/${poId}`);
}

/** Parse the hidden `lines` JSON payload a builder posts. */
function readLines(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return null;
  }
}

function readDraft(formData: FormData) {
  return {
    supplierId: formData.get("supplierId") ?? undefined,
    expectedDeliveryOn: formData.get("expectedDeliveryOn") ?? undefined,
    paymentTerms: formData.get("paymentTerms") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    lines: readLines(formData),
  };
}

export async function createPurchaseOrderAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const stageId = String(formData.get("stageId") ?? "");
  if (!stageId) return { error: "Choose the stage this order is for." };

  const parsed = purchaseOrderDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let poId: string | null;
  try {
    poId = await createPurchaseOrderDraft(stageId, parsed.data);
  } catch {
    return { error: "Could not save the draft. Try again." };
  }
  if (!poId)
    return { error: "That stage, or the chosen supplier, could not be found." };

  revalidatePO(projectId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function updatePurchaseOrderAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = purchaseOrderDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await updatePurchaseOrderDraft(poId, parsed.data);
  } catch {
    return { error: "Could not save your changes. Try again." };
  }
  if (!ok)
    return {
      error: "This draft could not be found, is already issued, or its supplier is not in the register.",
    };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function deletePurchaseOrderDraftAction(
  projectId: string,
  poId: string,
): Promise<void> {
  const ok = await deletePurchaseOrderDraft(poId);
  if (ok) {
    revalidatePO(projectId, poId);
    redirect(`/projects/${projectId}/procurement`);
  }
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

const ISSUE_ERRORS: Record<string, string> = {
  "not-found": "This order could not be found.",
  "not-draft": "This order has already been issued.",
  "no-lines": "Add at least one material line before issuing.",
  "supplier-missing":
    "Choose a supplier from the register before issuing this order.",
};

/**
 * Issue is a plain form action (no `useActionState`): on failure it redirects
 * back to the order with an `issue_error` query param the detail page surfaces.
 */
export async function issuePurchaseOrderAction(
  projectId: string,
  poId: string,
): Promise<void> {
  const base = `/projects/${projectId}/procurement/${poId}`;
  let result: Awaited<ReturnType<typeof issuePurchaseOrder>>;
  try {
    result = await issuePurchaseOrder(poId);
  } catch {
    redirect(`${base}?issue_error=${encodeURIComponent("Could not issue the order. Try again.")}`);
  }
  if (!result.ok) {
    redirect(
      `${base}?issue_error=${encodeURIComponent(ISSUE_ERRORS[result.reason] ?? "Could not issue.")}`,
    );
  }
  revalidatePO(projectId, poId);
  redirect(base);
}

const DELIVERY_ERRORS: Record<string, string> = {
  "not-found": "This order could not be found.",
  "not-ordered": "Deliveries can only be recorded against an issued order.",
  "unknown-line": "One of the delivery lines is not on this order.",
  "over-delivery":
    "This delivery takes a line past its ordered quantity — add a reason to record it anyway.",
};

export async function recordDeliveryAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deliverySchema.safeParse({
    deliveredOn: formData.get("deliveredOn") ?? undefined,
    noteNumber: formData.get("noteNumber") ?? undefined,
    siteNotes: formData.get("siteNotes") ?? undefined,
    overDeliveryReason: formData.get("overDeliveryReason") ?? undefined,
    lines: readLines(formData),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let result: Awaited<ReturnType<typeof recordDelivery>>;
  try {
    result = await recordDelivery(poId, parsed.data);
  } catch {
    return { error: "Could not record the delivery. Try again." };
  }
  if (!result.ok)
    return { error: DELIVERY_ERRORS[result.reason] ?? "Could not record the delivery." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function voidDeliveryAction(
  projectId: string,
  poId: string,
  deliveryId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidReasonSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await voidDelivery(poId, deliveryId, parsed.data.reason);
  } catch {
    return { error: "Could not void the delivery. Try again." };
  }
  if (!ok) return { error: "That delivery could not be found." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

const PAYMENT_ERRORS: Record<string, string> = {
  "not-found": "This order could not be found.",
  "not-ordered": "Payments can only be recorded against an issued order.",
  "over-payment":
    "This payment takes the paid total past the ordered total — add a reason to record it anyway.",
};

export async function recordPaymentAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = paymentSchema.safeParse({
    paidOn: formData.get("paidOn") ?? undefined,
    amount: formData.get("amount") ?? undefined,
    method: formData.get("method") ?? undefined,
    kind: formData.get("kind") ?? undefined,
    reference: formData.get("reference") ?? undefined,
    overPaymentReason: formData.get("overPaymentReason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let result: Awaited<ReturnType<typeof recordPayment>>;
  try {
    result = await recordPayment(poId, parsed.data);
  } catch {
    return { error: "Could not record the payment. Try again." };
  }
  if (!result.ok)
    return { error: PAYMENT_ERRORS[result.reason] ?? "Could not record the payment." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function voidPaymentAction(
  projectId: string,
  poId: string,
  paymentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidReasonSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await voidPayment(poId, paymentId, parsed.data.reason);
  } catch {
    return { error: "Could not void the payment. Try again." };
  }
  if (!ok) return { error: "That payment could not be found." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function cancelPurchaseOrderAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cancelSchema.safeParse({
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await cancelPurchaseOrder(poId, parsed.data.reason);
  } catch {
    return { error: "Could not cancel the order. Try again." };
  }
  if (!ok) return { error: "Only an issued order can be cancelled." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function closePurchaseOrderAction(
  projectId: string,
  poId: string,
): Promise<void> {
  const ok = await closePurchaseOrder(poId);
  if (ok) revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function reopenPurchaseOrderAction(
  projectId: string,
  poId: string,
): Promise<void> {
  const ok = await reopenPurchaseOrder(poId);
  if (ok) revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}

export async function recordSupplierAckAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierAckSchema.safeParse({
    supplierAckNote: formData.get("supplierAckNote") ?? undefined,
    supplierAckOn: formData.get("supplierAckOn") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let ok: boolean;
  try {
    ok = await recordSupplierAck(poId, parsed.data);
  } catch {
    return { error: "Could not save the acknowledgement. Try again." };
  }
  if (!ok) return { error: "This order could not be found." };

  revalidatePO(projectId, poId);
  redirect(`/projects/${projectId}/procurement/${poId}`);
}
