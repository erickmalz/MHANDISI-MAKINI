import { getFundingRequestDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/** The Issued Funding Request as an A4 PDF (ticket 10). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/funding/[frId]/document.pdf">,
) {
  const { id, frId } = await ctx.params;
  return serveDocument(
    () => getFundingRequestDocument(frId),
    (doc) => doc.projectId === id,
    "pdf",
  );
}
