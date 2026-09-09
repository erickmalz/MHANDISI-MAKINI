import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { DocumentInput } from "@/lib/data/documents";

import { PRINT_CSS } from "../print-css";
import { FeeInvoiceDoc } from "./FeeInvoiceDoc";
import { FundingRequestDoc } from "./FundingRequestDoc";
import { PurchaseOrderDoc } from "./PurchaseOrderDoc";

function pickTemplate(doc: DocumentInput): ReactElement {
  switch (doc.kind) {
    case "funding_request":
      return <FundingRequestDoc doc={doc} />;
    case "fee_invoice":
      return <FeeInvoiceDoc doc={doc} />;
    case "purchase_order":
      return <PurchaseOrderDoc doc={doc} />;
  }
}

/**
 * Turn a document's frozen snapshot (plus live profile + stamp) into a complete
 * HTML string for Chromium. `screenshot: true` adds the body class the print
 * stylesheet uses to swap page furniture for the single continuous-image layout
 * (ticket 10 §4).
 */
export function renderDocumentHtml(
  doc: DocumentInput,
  opts: { screenshot?: boolean } = {},
): string {
  const inner = renderToStaticMarkup(pickTemplate(doc));

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<title>${doc.snapshot.displayNumber}</title>` +
    `<style>${PRINT_CSS}</style></head>` +
    `<body class="${opts.screenshot ? "screenshot" : ""}">${inner}</body></html>`
  );
}
