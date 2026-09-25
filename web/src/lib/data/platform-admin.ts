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

/** Schedules the target Account for deletion, reusing the same 30-day grace period column the self-serve flow writes (`src/lib/data/account-deletion.ts`). No-op (returns `false`) if deletion is already scheduled. */
export async function scheduleAccountDeletionForAdmin(
  authUserId: string,
  accountId: string,
): Promise<boolean> {
  const result = await db.execute<{ result: boolean }>(
    sql`SELECT app.schedule_account_deletion_for_admin(${authUserId}, ${accountId}) AS result`,
  );
  return result.rows[0]?.result ?? false;
}

/** The admin-side mirror of the Engineer's own "sign in to cancel" (`.scratch/admin-portal/` ticket 03). No-op (returns `false`) if deletion isn't scheduled. */
export async function cancelAccountDeletionForAdmin(
  authUserId: string,
  accountId: string,
): Promise<boolean> {
  const result = await db.execute<{ result: boolean }>(
    sql`SELECT app.cancel_account_deletion_for_admin(${authUserId}, ${accountId}) AS result`,
  );
  return result.rows[0]?.result ?? false;
}

export interface PlatformAdminRow {
  authUserId: string;
  email: string;
  createdAt: Date;
  addedByEmail: string | null;
}

interface ListPlatformAdminsRow {
  [key: string]: unknown;
  auth_user_id: string;
  email: string;
  created_at: string;
  added_by_email: string | null;
}

/** Every current Platform Admin, for the Admins view (`.scratch/admin-portal/` ticket 02). Caller must already be a verified Platform Admin. */
export async function listPlatformAdmins(
  authUserId: string,
): Promise<PlatformAdminRow[]> {
  const rows = await db.execute<ListPlatformAdminsRow>(
    sql`SELECT * FROM app.list_platform_admins(${authUserId})`,
  );
  return rows.rows.map((r) => ({
    authUserId: r.auth_user_id,
    email: r.email,
    createdAt: new Date(r.created_at),
    addedByEmail: r.added_by_email,
  }));
}

export type AddPlatformAdminError = "not-found" | "already-admin";

/** Grants Platform Admin access to an existing user by email. Throws `AddPlatformAdminError` as the `message` on failure (translated by the caller). */
export async function addPlatformAdmin(
  authUserId: string,
  targetEmail: string,
): Promise<string> {
  try {
    const result = await db.execute<{ result: string }>(
      sql`SELECT app.add_platform_admin(${authUserId}, ${targetEmail}) AS result`,
    );
    return result.rows[0]!.result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("user not found")) {
      throw new Error("not-found" satisfies AddPlatformAdminError);
    }
    if (message.includes("already an admin")) {
      throw new Error("already-admin" satisfies AddPlatformAdminError);
    }
    throw error;
  }
}

/** Revokes Platform Admin access. Throws if the caller targets their own row (self-removal guard, ticket 02). */
export async function removePlatformAdmin(
  authUserId: string,
  targetAuthUserId: string,
): Promise<void> {
  await db.execute(
    sql`SELECT app.remove_platform_admin(${authUserId}, ${targetAuthUserId})`,
  );
}

export interface AdminAuditLogRow {
  id: string;
  actorEmail: string;
  action: string;
  targetAccountId: string | null;
  targetAccountName: string | null;
  targetAuthUserId: string | null;
  targetUserEmail: string | null;
  createdAt: Date;
}

interface ListAdminAuditLogRow {
  [key: string]: unknown;
  id: string;
  actor_email: string;
  action: string;
  target_account_id: string | null;
  target_account_name: string | null;
  target_auth_user_id: string | null;
  target_user_email: string | null;
  created_at: string;
}

/** Every admin action ever taken, newest first, for the Activity view (`.scratch/admin-portal/` ticket 05). Caller must already be a verified Platform Admin. */
export async function listAdminAuditLog(
  authUserId: string,
): Promise<AdminAuditLogRow[]> {
  const rows = await db.execute<ListAdminAuditLogRow>(
    sql`SELECT * FROM app.list_admin_audit_log(${authUserId})`,
  );
  return rows.rows.map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    targetAccountId: r.target_account_id,
    targetAccountName: r.target_account_name,
    targetAuthUserId: r.target_auth_user_id,
    targetUserEmail: r.target_user_email,
    createdAt: new Date(r.created_at),
  }));
}
