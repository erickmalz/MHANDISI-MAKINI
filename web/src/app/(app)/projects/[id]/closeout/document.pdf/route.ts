import { getProjectCloseoutReportDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/**
 * The frozen Project Closeout Report as an A4 PDF (Phase 4 ticket 04,
 * mirrors the Purchase Order / Funding Request document routes).
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/closeout/document.pdf">,
) {
  const { id } = await ctx.params;
  return serveDocument(
    () => getProjectCloseoutReportDocument(id),
    (doc) => doc.projectId === id,
    "pdf",
  );
}
