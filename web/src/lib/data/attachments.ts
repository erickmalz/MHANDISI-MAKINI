import "server-only";

import { eq } from "drizzle-orm";

import { getCurrentAccountId } from "./account-context";
import { attachments } from "./schema";
import { withAccount } from "./with-account";

/**
 * Document attachments (Operational Control decision 1,
 * `.scratch/operational-control/map.md`) — one proof file per Purchase
 * Order / Payment / Labour Payment record. Raw bytes in Postgres, same
 * pattern as `accounts.logo` (`./account-profile.ts`).
 *
 * UI wiring in this slice is Purchase-Order-only (`PurchaseOrder`); the
 * `PaymentRecord` / `LabourPayment` targets are fully supported here and in
 * the schema, ready for their own upload widgets as a fast-follow — see the
 * map's Slice 4 scoping note for why they weren't added to the existing
 * (large, working) `PurchaseOrderDetail` component in the same pass.
 */

export type AttachmentTarget = "purchaseOrder" | "paymentRecord" | "labourPayment";

const TARGET_COLUMN = {
  purchaseOrder: attachments.purchaseOrderId,
  paymentRecord: attachments.paymentRecordId,
  labourPayment: attachments.labourPaymentId,
} as const;

export interface AttachmentMeta {
  id: string;
  filename: string;
  contentType: string;
}

/** The attachment on one record, or `null` if it has none (or the record is missing / cross-account). */
export async function getAttachmentMeta(
  target: AttachmentTarget,
  entityId: string,
): Promise<AttachmentMeta | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ id: attachments.id, filename: attachments.filename, contentType: attachments.contentType })
      .from(attachments)
      .where(eq(TARGET_COLUMN[target], entityId))
      .limit(1);
    return row ?? null;
  });
}

export interface AttachmentFile {
  bytes: Buffer;
  contentType: string;
  filename: string;
}

/** The raw bytes of one attachment by its own id — what the download route serves. */
export async function getAttachmentFile(attachmentId: string): Promise<AttachmentFile | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ file: attachments.file, contentType: attachments.contentType, filename: attachments.filename })
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);
    if (!row) return null;
    return { bytes: row.file, contentType: row.contentType, filename: row.filename };
  });
}

/**
 * Set, replace, or remove (`file: null`) the one attachment on a record.
 * `UNIQUE(target_id)` in the schema caps it at one — this always clears any
 * existing attachment for the target first, so "replace" and "remove" are
 * the same delete, optionally followed by a fresh insert.
 */
export async function setAttachment(
  target: AttachmentTarget,
  entityId: string,
  file: { bytes: Buffer; contentType: string; filename: string } | null,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    await tx.delete(attachments).where(eq(TARGET_COLUMN[target], entityId));
    if (!file) return true;

    switch (target) {
      case "purchaseOrder":
        await tx.insert(attachments).values({
          accountId,
          purchaseOrderId: entityId,
          file: file.bytes,
          contentType: file.contentType,
          filename: file.filename,
        });
        return true;
      case "paymentRecord":
        await tx.insert(attachments).values({
          accountId,
          paymentRecordId: entityId,
          file: file.bytes,
          contentType: file.contentType,
          filename: file.filename,
        });
        return true;
      case "labourPayment":
        await tx.insert(attachments).values({
          accountId,
          labourPaymentId: entityId,
          file: file.bytes,
          contentType: file.contentType,
          filename: file.filename,
        });
        return true;
    }
  });
}
