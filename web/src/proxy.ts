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
  "/admin/login",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = getSessionCookie(request) != null;

  // Server Functions are POST requests to the page that calls them, not a
  // separate route Proxy's matcher can exclude (Next 16 docs, "Execution
  // order"). resolvePostSignInRedirect() fires this exact request from
  // /sign-in right after a successful sign-in — once the new session cookie
  // is already set — so `hasSession` flips true mid-flow and the redirect
  // below would otherwise catch that POST too. Next's action-fetch client
  // rejects a plain HTTP redirect response as "an unexpected response was
  // received from the server" (it only understands its own
  // `x-action-redirect` signal), which throws inside `onSubmit` with
  // nothing to catch it — the sign-in button just stops responding. Every
  // Server Function here re-verifies its own auth via
  // `requireUsableSession()`, so it's safe to let Proxy step aside entirely
  // for these.
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  if (!hasSession && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // A signed-in visitor revisiting the admin login has nowhere useful to go
  // but /admin — unlike the Engineer auth pages below, "/" would 404 them
  // out of Choose Project for an admin-only identity with no Account.
  if (hasSession && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
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
