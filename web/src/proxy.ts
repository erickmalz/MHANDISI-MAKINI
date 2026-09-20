import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic route gate only (ticket 06 / ADR 0002). Proxy checks *presence* of
 * the session cookie — no database call, no signature check. Every authenticated
 * Server Component, Server Action and Route Handler re-verifies through
 * `requireUsableSession()` / the DAL; proxy is never the last line of defence.
 */
const PUBLIC_PREFIXES = [
  "/welcome",
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/reset-password",
  "/legal",
  "/loading-studies",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = getSessionCookie(request) != null;

  if (!hasSession && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (
    hasSession &&
    (pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/welcome")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and static asset files.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
