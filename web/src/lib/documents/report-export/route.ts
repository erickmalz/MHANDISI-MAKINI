import "server-only";

import { NotAuthenticatedError } from "@/lib/data/account-context";
import type { ExportFormat } from "@/lib/reports/export-href";
import { parseReportFilters, type ReportKind } from "@/lib/reports/filters";

import { RenderUnavailableError } from "../render";
import { loadReportExport, renderReportExport } from ".";

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * The GET handler for one Report Export route (`…/export.pdf|jpg|csv`), so each
 * of the 24 route files is a one-liner:
 *
 *   export const GET = reportExportRoute("procurement", "pdf");
 *
 * The filters are the screen's own search params (ticket "Export formats and
 * whether filters carry into them": an export reproduces exactly the filtered
 * screen). Route Handlers skip the `(app)` layout, so the session gate is the
 * DAL's: no session, a missing project / party, or another Account's id is a
 * flat 404 that never confirms the thing exists. A busy / slow renderer is a
 * 503 "try again". Rendered on demand, streamed, never stored or cached.
 */
export function reportExportRoute(kind: ReportKind, format: ExportFormat) {
  return async function GET(
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ): Promise<Response> {
    const { id } = await ctx.params;
    const filters = parseReportFilters(kind, new URL(req.url).searchParams);

    let doc;
    try {
      doc = await loadReportExport(kind, id, filters);
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return notFound();
      throw err;
    }
    if (!doc) return notFound();

    try {
      const { bytes, contentType, filename } = await renderReportExport(doc, format);
      return new Response(bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (err) {
      if (err instanceof RenderUnavailableError) {
        return new Response(`${err.message} Please try again in a moment.`, {
          status: 503,
          headers: { "Content-Type": "text/plain", "Retry-After": "10" },
        });
      }
      throw err;
    }
  };
}
