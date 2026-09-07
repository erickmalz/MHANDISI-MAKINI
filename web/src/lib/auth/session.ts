import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./index";

/**
 * The authoritative session check — the single funnel every Server Component,
 * Server Action and Route Handler goes through (Next's DAL pattern; ticket 07).
 * `proxy.ts` only does an optimistic cookie-presence check and never this.
 *
 * `cache()` memoises it for the render pass, so many components can call it
 * without repeat work. better-auth's 60s cookie cache keeps most calls off the
 * database entirely.
 */
export const verifySession = cache(async () => {
  const result = await auth.api.getSession({ headers: await headers() });
  return result ?? null;
});

/** Days since a timestamp. */
function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export type UsableSession = {
  session: NonNullable<Awaited<ReturnType<typeof verifySession>>>["session"];
  user: NonNullable<Awaited<ReturnType<typeof verifySession>>>["user"];
  /**
   * The soft email gate has hardened: the account is unverified and older than
   * 7 days. The app shell renders the full-screen "verify to continue" instead
   * of the page (ticket 02).
   */
  emailGateActive: boolean;
};

/**
 * Guards the authenticated route group. Redirects to /sign-in when there is no
 * session; otherwise returns the session plus whether the 7-day email gate is
 * active.
 */
export async function requireUsableSession(): Promise<UsableSession> {
  const result = await verifySession();
  if (!result) redirect("/sign-in");

  const { session, user } = result;
  const emailGateActive =
    !user.emailVerified && daysSince(new Date(user.createdAt)) >= 7;

  return { session, user, emailGateActive };
}
