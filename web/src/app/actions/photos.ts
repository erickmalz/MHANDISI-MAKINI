"use server";

import { revalidatePath } from "next/cache";

import { deletePhoto, setPhoto } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import type { PhotoTarget } from "@/lib/photos";
import { photoMetaSchema } from "@/lib/validation/photos";

/**
 * Progress Photo Server Actions (Phase 4 Slice 4.1, ticket 02). Same
 * upload-validation split as `actions/attachments.ts`: file size/type is
 * checked here (a `File` from `FormData` isn't something Zod parses
 * directly), the rest of the form is validated with `photoMetaSchema`.
 *
 * This slice wires uploads onto the Stage detail page ("Stage photos") and
 * Site Diary entries; `uploadPhoto` itself is already generic across all
 * seven targets, ready for Task/Delivery/Payment/Variation upload actions to
 * be added as a fast-follow without touching this function.
 */

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function uploadPhoto(
  target: PhotoTarget,
  targetId: string,
  revalidateHref: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { photo: "Choose a PNG, JPEG, or WEBP photo to upload." } };
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { fieldErrors: { photo: "Photo must be a PNG, JPEG, or WEBP file." } };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { fieldErrors: { photo: "Photo must be 8MB or smaller." } };
  }

  const parsed = photoMetaSchema.safeParse({
    category: formData.get("category"),
    caption: formData.get("caption"),
    gpsLat: formData.get("gpsLat"),
    gpsLng: formData.get("gpsLng"),
    capturedOn: formData.get("capturedOn"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await setPhoto(target, targetId, {
      bytes,
      contentType: file.type,
      filename: file.name || "photo",
      category: parsed.data.category,
      caption: parsed.data.caption ?? null,
      gpsLat: parsed.data.gpsLat ?? null,
      gpsLng: parsed.data.gpsLng ?? null,
      capturedOn: parsed.data.capturedOn ?? null,
    });
  } catch {
    return { error: "Could not upload the photo. Try again." };
  }

  revalidatePath(revalidateHref);
  return {};
}

export async function uploadStagePhotoAction(
  projectId: string,
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return uploadPhoto("stage", stageId, `/projects/${projectId}/stages/${stageId}`, formData);
}

export async function uploadSiteDiaryPhotoAction(
  projectId: string,
  stageId: string,
  entryId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return uploadPhoto(
    "siteDiaryEntry",
    entryId,
    `/projects/${projectId}/stages/${stageId}`,
    formData,
  );
}

export async function deletePhotoAction(
  projectId: string,
  stageId: string,
  photoId: string,
): Promise<void> {
  await deletePhoto(photoId);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
}
