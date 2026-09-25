"use server";

import { revalidatePath } from "next/cache";

import {
  sendAdminCancelledDeletionEmail,
  sendAdminScheduledDeletionEmail,
} from "@/lib/auth/emails";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { GRACE_PERIOD_DAYS } from "@/lib/data/account-deletion";
import {
  addPlatformAdmin,
  cancelAccountDeletionForAdmin,
  getAccountForAdmin,
  removePlatformAdmin,
  scheduleAccountDeletionForAdmin,
  type AddPlatformAdminError,
} from "@/lib/data/platform-admin";

/**
 * Schedules the target Account for the same 30-day deletion grace period
 * the self-serve flow uses (`.scratch/platform-admin/` ticket 03), and
 * notifies the Engineer (`.scratch/admin-portal/` ticket 04) — skipped if
 * the schedule was a no-op (already scheduled).
 */
export async function scheduleAccountDeletionAction(
  accountId: string,
): Promise<void> {
  const { user } = await requirePlatformAdmin();
  const changed = await scheduleAccountDeletionForAdmin(user.id, accountId);
  if (changed) {
    const account = await getAccountForAdmin(user.id, accountId);
    if (account) {
      const deleteAt = new Date();
      deleteAt.setDate(deleteAt.getDate() + GRACE_PERIOD_DAYS);
      await sendAdminScheduledDeletionEmail(account.email, deleteAt);
    }
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/accounts/${accountId}`);
}

/**
 * Cancels a scheduled deletion (`.scratch/admin-portal/` ticket 03), and
 * notifies the Engineer (ticket 04) — skipped if it was a no-op (nothing
 * was scheduled).
 */
export async function cancelAccountDeletionAction(
  accountId: string,
): Promise<void> {
  const { user } = await requirePlatformAdmin();
  const changed = await cancelAccountDeletionForAdmin(user.id, accountId);
  if (changed) {
    const account = await getAccountForAdmin(user.id, accountId);
    if (account) await sendAdminCancelledDeletionEmail(account.email);
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/accounts/${accountId}`);
}

export type AddAdminActionState = { error?: string };

/** Grants Platform Admin access to an existing user by email (`.scratch/admin-portal/` ticket 02). */
export async function addAdminAction(
  _prev: AddAdminActionState,
  formData: FormData,
): Promise<AddAdminActionState> {
  const { user } = await requirePlatformAdmin();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter an email address." };

  try {
    await addPlatformAdmin(user.id, email);
  } catch (error) {
    const code = error instanceof Error ? (error.message as AddPlatformAdminError) : "";
    if (code === "not-found") {
      return { error: "No account with that email exists." };
    }
    if (code === "already-admin") {
      return { error: "That user is already a Platform Admin." };
    }
    throw error;
  }

  revalidatePath("/admin/admins");
  return {};
}

/** Revokes Platform Admin access (`.scratch/admin-portal/` ticket 02). The UI never offers this for the caller's own row (self-removal guard rail). */
export async function removeAdminAction(targetAuthUserId: string): Promise<void> {
  const { user } = await requirePlatformAdmin();
  await removePlatformAdmin(user.id, targetAuthUserId);
  revalidatePath("/admin/admins");
}
