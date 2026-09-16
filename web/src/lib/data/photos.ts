import "server-only";

import { desc, eq } from "drizzle-orm";

import type { PhotoCategory, PhotoMeta, PhotoTarget } from "@/lib/photos";

import { getCurrentAccountId } from "./account-context";
import { photos } from "./schema";
import { withAccount } from "./with-account";

/**
 * The Photos DAL (Phase 4 Slice 4.1, ticket 02) — generic across all seven
 * live targets (Project, Stage, Task, Site Diary Entry, Delivery, Payment
 * Record, Variation). Mirrors `attachments.ts`'s DAL shape, except `setPhoto`
 * always **adds** a row rather than replacing one: many photos per target are
 * allowed (no `UNIQUE` cap, ticket 02's Answer), so there is no "current
 * attachment" to clear first. "Exactly one target FK per row" is enforced
 * structurally — `setPhoto` takes exactly one target and never sets the
 * other six columns, so a cross-target row is unrepresentable through this
 * DAL (no DB `CHECK`, same posture `attachments.ts` describes for its own
 * polymorphism).
 */

const TARGET_COLUMN = {
  project: photos.projectId,
  stage: photos.stageId,
  task: photos.taskId,
  siteDiaryEntry: photos.siteDiaryEntryId,
  delivery: photos.deliveryId,
  paymentRecord: photos.paymentRecordId,
  variation: photos.variationId,
} as const;

const metaSelection = {
  id: photos.id,
  filename: photos.filename,
  contentType: photos.contentType,
  category: photos.category,
  caption: photos.caption,
  gpsLat: photos.gpsLat,
  gpsLng: photos.gpsLng,
  capturedOn: photos.capturedOn,
  createdAt: photos.createdAt,
} as const;

type MetaRow = {
  id: string;
  filename: string;
  contentType: string;
  category: PhotoCategory;
  caption: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  capturedOn: string | null;
  createdAt: Date | string;
};

function toMeta(r: MetaRow): PhotoMeta {
  return {
    id: r.id,
    filename: r.filename,
    contentType: r.contentType,
    category: r.category,
    caption: r.caption,
    gpsLat: r.gpsLat,
    gpsLng: r.gpsLng,
    capturedOn: r.capturedOn,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

/** Every photo attached to one target, newest first. */
export async function listPhotos(target: PhotoTarget, targetId: string): Promise<PhotoMeta[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(metaSelection)
      .from(photos)
      .where(eq(TARGET_COLUMN[target], targetId))
      .orderBy(desc(photos.createdAt))) as MetaRow[];
    return rows.map(toMeta);
  });
}

export interface PhotoFile {
  bytes: Buffer;
  contentType: string;
  filename: string;
}

/** The raw bytes of one photo by its own id — what the download route serves. */
export async function getPhotoFile(photoId: string): Promise<PhotoFile | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ file: photos.file, contentType: photos.contentType, filename: photos.filename })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);
    if (!row) return null;
    return { bytes: row.file, contentType: row.contentType, filename: row.filename };
  });
}

export interface SetPhotoInput {
  bytes: Buffer;
  contentType: string;
  filename: string;
  category: PhotoCategory;
  caption?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  capturedOn?: string | null;
}

/**
 * Add one photo against a target. Unlike `setAttachment`, this never
 * replaces an existing row — many photos per target are allowed (ticket 02's
 * Answer). Returns the new photo's id. Use `deletePhoto` to remove one.
 */
export async function setPhoto(
  target: PhotoTarget,
  targetId: string,
  input: SetPhotoInput,
): Promise<string> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const shared = {
      accountId,
      file: input.bytes,
      contentType: input.contentType,
      filename: input.filename,
      category: input.category,
      caption: input.caption ?? null,
      gpsLat: input.gpsLat ?? null,
      gpsLng: input.gpsLng ?? null,
      capturedOn: input.capturedOn ?? null,
    };

    let row: { id: string };
    switch (target) {
      case "project":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, projectId: targetId })
          .returning({ id: photos.id });
        break;
      case "stage":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, stageId: targetId })
          .returning({ id: photos.id });
        break;
      case "task":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, taskId: targetId })
          .returning({ id: photos.id });
        break;
      case "siteDiaryEntry":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, siteDiaryEntryId: targetId })
          .returning({ id: photos.id });
        break;
      case "delivery":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, deliveryId: targetId })
          .returning({ id: photos.id });
        break;
      case "paymentRecord":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, paymentRecordId: targetId })
          .returning({ id: photos.id });
        break;
      case "variation":
        [row] = await tx
          .insert(photos)
          .values({ ...shared, variationId: targetId })
          .returning({ id: photos.id });
        break;
    }
    return row.id;
  });
}

/** Remove one photo by its own id. `false` when missing / cross-account. */
export async function deletePhoto(photoId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(photos)
      .where(eq(photos.id, photoId))
      .returning({ id: photos.id });
    return res.length > 0;
  });
}
