import "server-only";

import { eq } from "drizzle-orm";

import type { AccountProfileInput } from "@/lib/validation/account";

import { getCurrentAccountId } from "./account-context";
import { accounts, auth_user } from "./schema";
import { withAccount } from "./with-account";

/**
 * The Account profile write DAL (Slice 2.8 Part 2) — the signed-in Engineer's
 * full name, phone and letterhead logo, edited from `/settings`.
 *
 * No `accountId` parameter on any function: `withAccount` sets the tenant GUC
 * and RLS restricts every read/write to the caller's own `accounts` row —
 * there is exactly one such row per session, so "pass the wrong account"
 * stays unrepresentable the same way it does for every other DAL module.
 * Updates still filter on `accounts.id` (fetched once via
 * `getCurrentAccountId`) rather than relying on RLS alone, matching every
 * other write in this DAL that filters on a row id and reads back the
 * affected-row count.
 *
 * Email is not writable here (ticket 02: changing it needs an out-of-scope
 * verification-link flow) — `getAccountProfile` reads it read-only from
 * `auth_user` (no RLS on that table; see `./schema/auth.ts`) purely for
 * display.
 */

export interface AccountProfile {
  fullName: string;
  phone: string;
  email: string;
  /** Whether a letterhead logo is set — never the bytes (see `getAccountLogo`). */
  hasLogo: boolean;
  logoContentType: string | null;
}

export interface AccountLogo {
  bytes: Buffer;
  contentType: string;
}

/** The current profile, or `null` if somehow reached with no Account row. */
export async function getAccountProfile(): Promise<AccountProfile | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        fullName: accounts.fullName,
        phone: accounts.phone,
        email: auth_user.email,
        logoContentType: accounts.logoContentType,
      })
      .from(accounts)
      .innerJoin(auth_user, eq(auth_user.id, accounts.userId))
      .limit(1);
    if (!row) return null;
    return {
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      hasLogo: row.logoContentType != null,
      logoContentType: row.logoContentType,
    };
  });
}

/** Update the Account's name and phone. `false` if the row is somehow gone. */
export async function updateAccountProfile(
  input: AccountProfileInput,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const res = await tx
      .update(accounts)
      .set({ fullName: input.fullName, phone: input.phone })
      .where(eq(accounts.id, accountId))
      .returning({ id: accounts.id });
    return res.length > 0;
  });
}

/**
 * Set, replace, or remove the letterhead logo — pass the new bytes + content
 * type, or `null` to clear both. `false` if the row is somehow gone.
 */
export async function setAccountLogo(
  logo: { bytes: Buffer; contentType: string } | null,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const res = await tx
      .update(accounts)
      .set({
        logo: logo?.bytes ?? null,
        logoContentType: logo?.contentType ?? null,
      })
      .where(eq(accounts.id, accountId))
      .returning({ id: accounts.id });
    return res.length > 0;
  });
}

/**
 * The raw logo bytes for the `/settings/logo` preview route — never handed to
 * a Server Component as a page prop (see `getAccountProfile`'s `hasLogo`
 * instead). `null` when unset.
 */
export async function getAccountLogo(): Promise<AccountLogo | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ logo: accounts.logo, logoContentType: accounts.logoContentType })
      .from(accounts)
      .limit(1);
    if (!row || !row.logo || !row.logoContentType) return null;
    return { bytes: row.logo, contentType: row.logoContentType };
  });
}
