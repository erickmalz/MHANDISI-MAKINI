import { getAccountLogo } from "@/lib/data";
import { NotAuthenticatedError } from "@/lib/data/account-context";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * The signed-in Engineer's letterhead logo bytes (Slice 2.8 Part 2) — the
 * preview image for `/settings`, and the same bytes the letterhead is built
 * from (there via an inline `data:` URI, see `@/lib/data/documents`).
 *
 * Route Handlers don't run the `(app)` layout, so — same pattern as the
 * issued-document routes (`@/lib/documents/response.ts`) — the session gate
 * here is the DAL itself: `getAccountLogo` throws `NotAuthenticatedError`
 * with no session, and RLS scopes the read to the caller's own Account. No
 * session, or no logo set, is a flat 404.
 */
export async function GET(): Promise<Response> {
  let logo;
  try {
    logo = await getAccountLogo();
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return notFound();
    throw err;
  }
  if (!logo) return notFound();

  return new Response(logo.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
