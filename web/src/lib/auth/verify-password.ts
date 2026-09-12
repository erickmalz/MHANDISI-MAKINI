import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/data/db";
import { auth_account } from "@/lib/data/schema";

import { verifyPassword } from "./argon2";

/**
 * Re-checks the signed-in user's current password against the credential
 * provider's stored hash — the "re-enter your password" step ticket 02
 * requires before a destructive action (self-serve account deletion; a
 * future password/email change would reuse this too).
 *
 * Reads `auth_account` directly rather than going through `getAuth().api`:
 * there is no better-auth endpoint that verifies a password without also
 * changing it or minting a new session, and `auth_account` is explicitly
 * not RLS-scoped (see `@/lib/data/schema/auth.ts`) — it is only ever meant
 * to be touched from the auth module, which is exactly where this lives.
 * `false` for a social-only account (no `password` row) as well as a wrong
 * password.
 */
export async function verifyCurrentUserPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const [row] = await db
    .select({ password: auth_account.password })
    .from(auth_account)
    .where(and(eq(auth_account.userId, userId), eq(auth_account.providerId, "credential")))
    .limit(1);

  if (!row?.password) return false;
  return verifyPassword(row.password, password);
}
