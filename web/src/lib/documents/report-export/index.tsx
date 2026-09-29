import "server-only";

import { buildExportModel } from "@/lib/reports/export-table";
import { reportToCsv } from "@/lib/reports/csv";
import { reportExportFilename } from "@/lib/reports/export-filename";
import type { ExportFormat } from "@/lib/reports/export-href";

import { PRINT_CSS } from "../print-css";
import { renderJpg, renderPdf } from "../render";
import type { RenderedDocument } from "..";
import type { ReportExportDocument } from "./load";
import { REPORT_CSS } from "./report-css";
import { ReportExportDoc } from "./ReportExportDoc";

export { loadReportExport, type ReportExportDocument } from "./load";

/**
 * A Report Export as a complete HTML string for Chromium: the Issued Document
 * stylesheet plus the landscape report additions. `screenshot: true` is the
 * one-continuous-image JPG variant. `react-dom/server` is imported dynamically
 * for the same reason as `templates/render-html.tsx`.
 */
export async function renderReportExportHtml(
  doc: ReportExportDocument,
  opts: { screenshot?: boolean } = {},
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const model = buildExportModel(doc.data, { t: doc.t, locale: doc.locale, filterState: doc.filterState });
  const inner = renderToStaticMarkup(<ReportExportDoc doc={doc} model={model} />);
  const title = `${doc.scopeLabel}`.replace(/</g, "&lt;");
  return (
    `<!doctype html><html lang="${doc.locale}"><head><meta charset="utf-8">` +
    `<title>${title}</title>` +
    `<style>${PRINT_CSS}${REPORT_CSS}</style></head>` +
    `<body class="landscape${opts.screenshot ? " screenshot" : ""}">${inner}</body></html>`
  );
}

/** Render one Report Export as a landscape PDF, a landscape-width JPG, or a CSV. */
export async function renderReportExport(
  doc: ReportExportDocument,
  format: ExportFormat,
): Promise<RenderedDocument> {
  const filename = reportExportFilename({
    kind: doc.kind,
    scopeLabel: doc.scopeLabel,
    format,
    filtered: doc.filterState.active.length > 0,
    at: doc.asOf,
  });

  if (format === "csv") {
    const csv = reportToCsv(doc.data, { t: doc.t, locale: doc.locale, filterState: doc.filterState });
    return {
      bytes: new TextEncoder().encode(csv),
      contentType: "text/csv; charset=utf-8",
      filename,
    };
  }
  if (format === "pdf") {
    return {
      bytes: await renderPdf(await renderReportExportHtml(doc), { landscape: true }),
      contentType: "application/pdf",
      filename,
    };
  }
  return {
    bytes: await renderJpg(await renderReportExportHtml(doc, { screenshot: true }), {
      landscape: true,
    }),
    contentType: "image/jpeg",
    filename,
  };
}
