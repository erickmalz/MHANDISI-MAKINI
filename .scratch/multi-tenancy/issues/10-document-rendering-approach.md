# Document rendering approach for issued Funding Requests, Fee Invoices and Purchase Orders

Type: grilling
Status: open
Blocked by: 09

## Question

Ticket 09 fixed *what* the shareable documents are and their lifecycle rules:
Funding Request, Fee Invoice and Purchase Order each render — once Issued — from
their exact frozen snapshot, on demand, never stored, as a PDF (authoritative)
plus a JPG of the same content, download-only in v1. What it did **not** decide
is *how* they are produced.

Decide:

- **The rendering engine and where it runs.** Options span a PDF toolkit
  building the document programmatically (e.g. pdf-lib / pdfkit), an
  HTML-template-to-PDF path via headless Chromium (high fidelity, heavy in the
  container — ties to ticket 05's "one long-running Node/Docker container"
  shape), or a React-to-PDF renderer. Weigh fidelity, container weight, cold
  vs warm cost (there is no serverless here), and font control for TZS / date
  formatting.
- **The template system.** One template per document type, three total. How are
  they authored and kept in sync with the `finance.ts` figures and the
  `CONTEXT.md` vocabulary they must display.
- **PDF → JPG conversion.** Same rendered pages as a single image — the tool and
  the page-flattening rule for a multi-page Funding Request.
- **Per-document layout.** What each of the three documents must show
  (guidelines §18 lists the Funding Request's required content; §20 / §22 the
  others), including the fee line shown on the client-facing Funding Request for
  transparency (Phase 1 Fee Collection Method decision).
- **Where this sits operationally.** Whether the rendering capability is part of
  the app container or a companion process, and how that interacts with the
  still-open Deployment shape fog on the map.

**Out of scope for this ticket** (already deferred by ticket 09): tokenised
public shareable links that let a client open a document with no login — that
opens an unauthenticated-access surface and gets its own decision later.

Resolve by fixing the rendering engine, the template approach, the JPG path, and
the operational placement.
