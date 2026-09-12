import { getAttachmentFile } from "@/lib/data";
import { NotAuthenticatedError } from "@/lib/data/account-context";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * Serves one attachment's raw bytes (Operational Control decision 1).
 * `inline`, not `attachment` — a PDF/image should preview in the browser
 * tab, matching how a receipt is normally checked. Same session-gate
 * pattern as `/settings/logo`: the DAL throws `NotAuthenticatedError` with
 * no session, RLS scopes the read to the caller's Account, and either is a
 * flat 404 (no session leak).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
): Promise<Response> {
  const { attachmentId } = await params;
  let file;
  try {
    file = await getAttachmentFile(attachmentId);
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
