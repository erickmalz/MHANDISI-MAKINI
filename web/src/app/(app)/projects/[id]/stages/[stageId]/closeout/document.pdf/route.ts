import { getStageCloseoutReportDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/**
 * The frozen Stage Closeout Report as an A4 PDF (Phase 4 ticket 03). 404s
 * for a stage with no `stage_closeouts` row — not yet closed, or closed
 * before this feature shipped (the closeout screen explains the latter case
 * inline rather than surfacing a broken link here).
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/stages/[stageId]/closeout/document.pdf">,
) {
  const { id, stageId } = await ctx.params;
  return serveDocument(
    () => getStageCloseoutReportDocument(stageId),
    (doc) => doc.projectId === id,
    "pdf",
  );
}
