import { getPurchaseOrderDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/**
 * The Issued Purchase Order as an A4 PDF (ticket 10). The order as issued — no
 * Commitment State, no delivered / paid progress (§7).
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/procurement/[poId]/document.pdf">,
) {
  const { id, poId } = await ctx.params;
  return serveDocument(
    () => getPurchaseOrderDocument(poId),
    (doc) => doc.projectId === id,
    "pdf",
  );
}
