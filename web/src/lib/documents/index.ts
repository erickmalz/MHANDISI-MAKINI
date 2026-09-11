import "server-only";

import type { DocumentInput } from "@/lib/data/documents";

import { renderJpg, renderPdf } from "./render";
import { renderDocumentHtml } from "./templates/render-html";

export { RenderUnavailableError } from "./render";
export { closeBrowser } from "./browser";

export type DocumentFormat = "pdf" | "jpg";

export interface RenderedDocument {
  bytes: Uint8Array;
  contentType: string;
  /** Suggested `Content-Disposition` filename, from the frozen number. */
  filename: string;
}

/**
 * Render one issued document to a PDF or a single continuous JPG (ticket 10
 * §4/§6). The renderer only ever sees the frozen snapshot (plus the live
 * letterhead profile and derived stamp) — never the live domain tables.
 */
export async function renderDocument(
  doc: DocumentInput,
  format: DocumentFormat,
): Promise<RenderedDocument> {
  const base = doc.snapshot.displayNumber
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");

  if (format === "pdf") {
    return {
      bytes: await renderPdf(await renderDocumentHtml(doc)),
      contentType: "application/pdf",
      filename: `${base}.pdf`,
    };
  }

  return {
    bytes: await renderJpg(await renderDocumentHtml(doc, { screenshot: true })),
    contentType: "image/jpeg",
    filename: `${base}.jpg`,
  };
}
