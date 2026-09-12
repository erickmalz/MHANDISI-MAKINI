"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifyCurrentUserPassword } from "@/lib/auth/verify-password";
import { sendDeletionScheduledEmail } from "@/lib/auth/emails";
import { verifySession } from "@/lib/auth/session";
import {
  GRACE_PERIOD_DAYS,
  scheduleAccountDeletion,
  setAccountLogo,
  updateAccountProfile,
} from "@/lib/data";
import { type ActionState, zodFieldErrors } from "@/lib/forms/action-helpers";
import {
  accountDeletionInputSchema,
  accountProfileInputSchema,
} from "@/lib/validation/account";

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

/**
 * Self-serve account deletion request (Slice 2.8 Part 4 / ticket 02):
 * re-verify the password, check the typed confirmation email against the
 * real one, then schedule the 30-day grace period and send the "deletion
 * scheduled" email. Sessions are left alone — signing back in is the
 * documented way to cancel (ticket 02), and that cancellation is wired
 * through better-auth's `databaseHooks.session.create.after`
 * (`@/lib/auth/index.ts`) once migration `0005` lands the SECURITY DEFINER
 * function it calls.
 *
 * Deliberately does not call `getCurrentAccountId` / `withAccount` itself —
 * `verifySession` is enough to get the user id + email needed here, and
 * `scheduleAccountDeletion` does its own RLS-scoped write.
 */
export async function requestAccountDeletionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountDeletionInputSchema.safeParse({
    password: formData.get("password") ?? undefined,
    confirmEmail: formData.get("confirmEmail") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const session = await verifySession();
  if (!session) return { error: "Your session ended. Sign in again." };

  const { password, confirmEmail } = parsed.data;
  const { id: userId, email } = session.user;

  if (confirmEmail.toLowerCase() !== email.toLowerCase()) {
    return {
      fieldErrors: { confirmEmail: "Type your email address exactly as shown above." },
    };
  }

  const passwordOk = await verifyCurrentUserPassword(userId, password);
  if (!passwordOk) {
    return { fieldErrors: { password: "That password is incorrect." } };
  }

  const ok = await scheduleAccountDeletion();
  if (!ok) return { error: "Could not schedule deletion. Try again." };

  const deleteAt = new Date();
  deleteAt.setDate(deleteAt.getDate() + GRACE_PERIOD_DAYS);
  await sendDeletionScheduledEmail(email, deleteAt);

  revalidatePath("/settings");
  return {};
}
