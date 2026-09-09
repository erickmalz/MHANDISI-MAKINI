import { getPurchaseOrderDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/** The Issued Purchase Order as one continuous JPG for sharing (ticket 10 §4). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/procurement/[poId]/document.jpg">,
) {
  const { id, poId } = await ctx.params;
  return serveDocument(
    () => getPurchaseOrderDocument(poId),
    (doc) => doc.projectId === id,
    "jpg",
  );
}
