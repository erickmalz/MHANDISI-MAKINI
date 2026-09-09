import { getFeeInvoiceDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/** The Fee Invoice as one continuous JPG for sharing (ticket 10 §4). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/funding/[frId]/fee-invoice.jpg">,
) {
  const { id, frId } = await ctx.params;
  return serveDocument(
    () => getFeeInvoiceDocument(frId),
    (doc) => doc.projectId === id,
    "jpg",
  );
}
