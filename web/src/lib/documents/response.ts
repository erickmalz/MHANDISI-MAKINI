import "server-only";

import { NotAuthenticatedError } from "@/lib/data/account-context";
import type { DocumentInput } from "@/lib/data/documents";

import { renderDocument, RenderUnavailableError, type DocumentFormat } from ".";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * Load, authorise and stream one issued document as an attachment (ticket 10
 * §6). No temp file, no storage.
 *
 * Route Handlers do not run the `(app)` layout, so the session gate here is the
 * one in the DAL: `getCurrentAccountId` throws `NotAuthenticatedError` with no
 * session, and RLS scopes the read. A missing / draft / cross-account record,
 * or no session, is a flat 404 — the response never confirms a document exists.
 * A render gate/timeout overload is a 503 "try again".
 */
export async function serveDocument<T extends DocumentInput>(
  load: () => Promise<T | null>,
  belongsToRoute: (doc: T) => boolean,
  format: DocumentFormat,
): Promise<Response> {
  let doc: T | null;
  try {
    doc = await load();
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return notFound();
    throw err;
  }
  if (!doc || !belongsToRoute(doc)) return notFound();

  try {
    const { bytes, contentType, filename } = await renderDocument(doc, format);
    // A Uint8Array is a valid runtime body; the cast sidesteps the lib.dom
    // `ArrayBufferLike` vs `ArrayBuffer` friction only.
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Per-client, re-rendered on demand — never cache in a shared proxy.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof RenderUnavailableError) {
      return new Response(`${err.message} Please try again in a moment.`, {
        status: 503,
        headers: { "Content-Type": "text/plain", "Retry-After": "10" },
      });
    }
    throw err;
  }
}
