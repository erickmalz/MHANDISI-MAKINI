import type { ReactElement } from "react";

import type { DocumentInput } from "@/lib/data/documents";

import { PRINT_CSS } from "../print-css";
import { FeeInvoiceDoc } from "./FeeInvoiceDoc";
import { FundingRequestDoc } from "./FundingRequestDoc";
import { ProjectCloseoutReportDoc } from "./ProjectCloseoutReportDoc";
import { PurchaseOrderDoc } from "./PurchaseOrderDoc";
import { StageCloseoutReportDoc } from "./StageCloseoutReportDoc";

function pickTemplate(doc: DocumentInput): ReactElement {
  switch (doc.kind) {
    case "funding_request":
      return <FundingRequestDoc doc={doc} />;
    case "fee_invoice":
      return <FeeInvoiceDoc doc={doc} />;
    case "purchase_order":
      return <PurchaseOrderDoc doc={doc} />;
    case "stage_closeout_report":
      return <StageCloseoutReportDoc doc={doc} />;
    case "project_closeout_report":
      return <ProjectCloseoutReportDoc doc={doc} />;
  }
}

/**
 * Turn a document's frozen snapshot (plus live profile + stamp) into a complete
 * HTML string for Chromium. `screenshot: true` adds the body class the print
 * stylesheet uses to swap page furniture for the single continuous-image layout
 * (ticket 10 §4).
 *
 * `react-dom/server` is imported dynamically so Next's build does not mistake
 * this render helper for a component tree — it runs only inside the document
 * Route Handlers, never in a page render.
 */
export async function renderDocumentHtml(
  doc: DocumentInput,
  opts: { screenshot?: boolean } = {},
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const inner = renderToStaticMarkup(pickTemplate(doc));

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<title>${doc.snapshot.displayNumber.replace(/</g, "&lt;")}</title>` +
    `<style>${PRINT_CSS}</style></head>` +
    `<body class="${opts.screenshot ? "screenshot" : ""}">${inner}</body></html>`
  );
}
