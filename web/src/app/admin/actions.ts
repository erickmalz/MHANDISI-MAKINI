"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { scheduleAccountDeletionForAdmin } from "@/lib/data/platform-admin";

/**
 * Ticket 03's one admin-triggerable action — schedules the target Account
 * for the same 30-day deletion grace period the self-serve flow uses.
 * Whether the Engineer is notified is explicitly undecided (map's "Not yet
 * specified"); no email is sent here.
 */
export async function scheduleAccountDeletionAction(
  accountId: string,
): Promise<void> {
  const { user } = await requirePlatformAdmin();
  await scheduleAccountDeletionForAdmin(user.id, accountId);
  revalidatePath("/admin");
  revalidatePath(`/admin/accounts/${accountId}`);
}
