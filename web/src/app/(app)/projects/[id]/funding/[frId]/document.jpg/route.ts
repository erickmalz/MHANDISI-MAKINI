import { getFundingRequestDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/** The Issued Funding Request as one continuous JPG for sharing (ticket 10 §4). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/funding/[frId]/document.jpg">,
) {
  const { id, frId } = await ctx.params;
  return serveDocument(
    () => getFundingRequestDocument(frId),
    (doc) => doc.projectId === id,
    "jpg",
  );
}
