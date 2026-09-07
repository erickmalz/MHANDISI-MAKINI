import "server-only";

import { cache } from "react";
import { sql } from "drizzle-orm";

import { verifySession } from "@/lib/auth/session";

import { db } from "./db";

/** Thrown when account-scoped data is reached without a signed-in session. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated.");
    this.name = "NotAuthenticatedError";
  }
}

/**
 * The current request's tenant key (multi-tenancy ticket 06).
 *
 * Composes the authoritative session check, then resolves `accounts.id` from
 * the session's `auth_user.id` via the SECURITY DEFINER function
 * `app.account_id_for_user` — a read that has to happen *before* any account
 * context (and therefore before RLS on `accounts`) is in effect.
 *
 * The account id is never a parameter to any DAL function; `withAccount()`
 * (./with-account.ts) is the only consumer, and it injects the id into the
 * transaction via `SET LOCAL`. "Pass the wrong account" is unrepresentable.
 */
export const getCurrentAccountId = cache(async (): Promise<string> => {
  const result = await verifySession();
  if (!result) throw new NotAuthenticatedError();

  const rows = await db.execute<{ account_id: string | null }>(
    sql`SELECT app.account_id_for_user(${result.user.id}) AS account_id`,
  );
  const accountId = rows.rows[0]?.account_id;

  if (!accountId) {
    // The provisioning trigger creates the row with the user, so this only
    // happens if the account was hard-deleted mid-session.
    throw new NotAuthenticatedError();
  }
  return accountId;
});
