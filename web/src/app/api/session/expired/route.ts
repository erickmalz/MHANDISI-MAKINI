import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/session";

/**
 * Landing spot for a session cookie that exists but no longer resolves to a
 * session (DB reset, rotated secret, revoked session). proxy.ts only checks
 * cookie presence, so without clearing it /sign-in bounces back to / forever.
 * Server Components can't delete cookies, hence a Route Handler.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/sign-in", request.url));

  // Only clear when the session really is dead, so this can't be used as a
  // cross-site forced sign-out.
  if (await verifySession()) return response;

  for (const { name } of request.cookies.getAll()) {
    if (!name.includes("better-auth.")) continue;
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      secure: name.startsWith("__Secure-"),
    });
  }
  return response;
}
