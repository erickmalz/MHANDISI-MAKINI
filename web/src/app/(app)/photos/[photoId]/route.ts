import { getPhotoFile } from "@/lib/data";
import { NotAuthenticatedError } from "@/lib/data/account-context";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * Serves one photo's raw bytes (Phase 4 Slice 4.1, ticket 02). `inline`, not
 * `attachment` — a photo should preview in the browser tab / `<img>` tag.
 * Same session-gate pattern as `/attachments/[attachmentId]`: the DAL throws
 * `NotAuthenticatedError` with no session, RLS scopes the read to the
 * caller's Account, and either is a flat 404 (no session leak).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
): Promise<Response> {
  const { photoId } = await params;
  let file;
  try {
    file = await getPhotoFile(photoId);
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return notFound();
    throw err;
  }
  if (!file) return notFound();

  return new Response(file.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
