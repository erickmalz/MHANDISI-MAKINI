import { getStageCloseoutReportDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/** The frozen Stage Closeout Report as one continuous JPG for sharing (Phase 4 ticket 03). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/stages/[stageId]/closeout/document.jpg">,
) {
  const { id, stageId } = await ctx.params;
  return serveDocument(
    () => getStageCloseoutReportDocument(stageId),
    (doc) => doc.projectId === id,
    "jpg",
  );
}
