"use server";

import { revalidatePath } from "next/cache";

import { setAttachment, type AttachmentTarget } from "@/lib/data";
import { type ActionState } from "@/lib/forms/action-helpers";

/**
 * Document attachment Server Actions (Operational Control decision 1). A
 * default this brief sets (the ticket doesn't specify one): uploads are
 * capped at 5MB and must be `application/pdf`, `image/png`, or `image/jpeg`
 * — a receipt or delivery note is realistically a scan or a photo, larger
 * than the 1MB logo cap but not unbounded.
 */

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

async function uploadAttachment(
  target: AttachmentTarget,
  entityId: string,
  revalidateHref: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { attachment: "Choose a PDF, PNG, or JPEG file to attach." } };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { fieldErrors: { attachment: "Attachment must be a PDF, PNG, or JPEG file." } };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { fieldErrors: { attachment: "Attachment must be 5MB or smaller." } };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ok = await setAttachment(target, entityId, {
      bytes,
      contentType: file.type,
      filename: file.name || "attachment",
    });
    if (!ok) return { error: "Could not upload the attachment. Try again." };
  } catch {
    return { error: "Could not upload the attachment. Try again." };
  }

  revalidatePath(revalidateHref);
  return {};
}

export async function uploadPurchaseOrderAttachmentAction(
  projectId: string,
  poId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return uploadAttachment(
    "purchaseOrder",
    poId,
    `/projects/${projectId}/procurement/${poId}`,
    formData,
  );
}

export async function removePurchaseOrderAttachmentAction(
  projectId: string,
  poId: string,
): Promise<void> {
  await setAttachment("purchaseOrder", poId, null);
  revalidatePath(`/projects/${projectId}/procurement/${poId}`);
}
