import { getFeeInvoiceDocument } from "@/lib/data";
import { serveDocument } from "@/lib/documents/response";

/**
 * The Fee Invoice raised for this Funding Request version, as an A4 PDF. Its
 * own route because a Fee Invoice has no standalone page — it is 1:1-ish with
 * the Funding Request whose Issue raised it (ticket 10 §6/§8).
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/projects/[id]/funding/[frId]/fee-invoice.pdf">,
) {
  const { id, frId } = await ctx.params;
  return serveDocument(
    () => getFeeInvoiceDocument(frId),
    (doc) => doc.projectId === id,
    "pdf",
  );
}
