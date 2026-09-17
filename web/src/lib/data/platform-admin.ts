import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "./db";
import { platform_admins } from "./schema";

/**
 * Platform Admin checks and cross-Account reads (`.scratch/platform-admin/`,
 * tickets 01-03). Deliberately NOT `withAccount`-scoped — a Platform Admin
 * owns no Account. The membership check is a plain, unprivileged read
 * (`platform_admins` carries no RLS); the two operations that cross or
 * bypass a single Account's own scope go through SECURITY DEFINER functions
 * (migration `0011`) that re-verify membership themselves.
 */

export async function isPlatformAdmin(authUserId: string): Promise<boolean> {
  const [row] = await db
    .select({ authUserId: platform_admins.authUserId })
    .from(platform_admins)
    .where(eq(platform_admins.authUserId, authUserId))
    .limit(1);
  return row != null;
}

export interface AdminAccountRow {
  accountId: string;
  fullName: string;
  phone: string;
  email: string;
  createdAt: Date;
  acceptedTermsVersion: string | null;
  acceptedTermsAt: Date | null;
  deletionScheduledAt: Date | null;
  projectCount: number;
}

interface ListAccountsForAdminRow {
  [key: string]: unknown;
  account_id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
  accepted_terms_version: string | null;
  accepted_terms_at: string | null;
  deletion_scheduled_at: string | null;
  project_count: string;
}

function toAdminAccountRow(r: ListAccountsForAdminRow): AdminAccountRow {
  return {
    accountId: r.account_id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    createdAt: new Date(r.created_at),
    acceptedTermsVersion: r.accepted_terms_version,
    acceptedTermsAt: r.accepted_terms_at ? new Date(r.accepted_terms_at) : null,
    deletionScheduledAt: r.deletion_scheduled_at
      ? new Date(r.deletion_scheduled_at)
      : null,
    projectCount: Number(r.project_count),
  };
}

/** Every Account, for the admin list/detail screens. Caller must already be a verified Platform Admin — this re-checks via `app.list_accounts_for_admin`. */
export async function listAccountsForAdmin(
  authUserId: string,
): Promise<AdminAccountRow[]> {
  const rows = await db.execute<ListAccountsForAdminRow>(
    sql`SELECT * FROM app.list_accounts_for_admin(${authUserId})`,
  );
  return rows.rows.map(toAdminAccountRow);
}

export async function getAccountForAdmin(
  authUserId: string,
  accountId: string,
): Promise<AdminAccountRow | null> {
  const rows = await listAccountsForAdmin(authUserId);
  return rows.find((r) => r.accountId === accountId) ?? null;
}

/** Schedules the target Account for deletion, reusing the same 30-day grace period column the self-serve flow writes (`src/lib/data/account-deletion.ts`). No-op if deletion is already scheduled. */
export async function scheduleAccountDeletionForAdmin(
  authUserId: string,
  accountId: string,
): Promise<void> {
  await db.execute(
    sql`SELECT app.schedule_account_deletion_for_admin(${authUserId}, ${accountId})`,
  );
}
