import "server-only";

import { eq } from "drizzle-orm";

import { getCurrentAccountId } from "./account-context";
import { accounts } from "./schema";
import { withAccount } from "./with-account";

/**
 * Self-serve account deletion, request side (Slice 2.8 Part 4 / ticket 02).
 *
 * Only the *scheduling* lives here — an ordinary RLS-scoped write on a column
 * that landed with Part 1, same as every other write in this DAL. The two
 * privileged pieces the ticket also needs — clearing this on sign-in (no
 * account context exists yet at that point) and the maintenance-role sweep
 * that hard-deletes past the grace period — go through the SECURITY DEFINER
 * function / grant added in migration `0005`, not through `withAccount`; see
 * `src/lib/auth/index.ts`'s `databaseHooks` and
 * `scripts/sweep-deletions.ts`.
 */

/** Ticket 02's grace period. Shared by the request action, the deletion-scheduled email, and the settings UI so all three agree on the deadline. */
export const GRACE_PERIOD_DAYS = 30;

export interface AccountDeletionStatus {
  /** `null` if deletion is not scheduled. */
  scheduledAt: Date | null;
}

export async function getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ scheduledAt: accounts.deletionScheduledAt })
      .from(accounts)
      .limit(1);
    return { scheduledAt: row?.scheduledAt ?? null };
  });
}

/** Marks the caller's Account for deletion after the 30-day grace period. `false` if the row is somehow gone. */
export async function scheduleAccountDeletion(): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const res = await tx
      .update(accounts)
      .set({ deletionScheduledAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning({ id: accounts.id });
    return res.length > 0;
  });
}
