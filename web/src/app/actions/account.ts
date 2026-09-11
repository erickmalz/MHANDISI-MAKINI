"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setAccountLogo, updateAccountProfile } from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import { accountProfileInputSchema } from "@/lib/validation/account";

/**
 * Account profile Server Actions (Slice 2.8 Part 2) — name/phone and the
 * letterhead logo, both scoped to `/settings`. Each re-validates through the
 * DAL (`withAccount` + RLS) like every other Server Action here.
 *
 * A default this brief sets (the ticket doesn't specify one): logo uploads
 * are capped at 1MB and must be `image/png` or `image/jpeg`. A `File` isn't
 * something Zod validates the same way as text fields, so size/type are
 * checked by hand before the bytes ever reach the DAL, and rejection is a
 * field error, not a thrown exception, so the form can show it.
 */

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

export async function updateAccountProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountProfileInputSchema.safeParse({
    fullName: formData.get("fullName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    const ok = await updateAccountProfile(parsed.data);
    if (!ok) return { error: "Could not save your changes. Try again." };
  } catch {
    return { error: "Could not save your changes. Try again." };
  }

  revalidatePath("/settings");
  return {};
}

export async function uploadAccountLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { logo: "Choose a PNG or JPEG image to upload." } };
  }
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { fieldErrors: { logo: "Logo must be a PNG or JPEG image." } };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { fieldErrors: { logo: "Logo must be 1MB or smaller." } };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ok = await setAccountLogo({ bytes, contentType: file.type });
    if (!ok) return { error: "Could not upload the logo. Try again." };
  } catch {
    return { error: "Could not upload the logo. Try again." };
  }

  revalidatePath("/settings");
  return {};
}

/**
 * A plain form action (no `useActionState` / field data), matching the
 * "discard" / "close" / "reopen" actions elsewhere (e.g. `procurement.ts`'s
 * `closePurchaseOrderAction`) — nothing to validate, so there's nothing to
 * report back inline; a thrown error surfaces via the route's error boundary.
 */
export async function removeAccountLogoAction(): Promise<void> {
  await setAccountLogo(null);
  revalidatePath("/settings");
  redirect("/settings");
}
