---
status: accepted
---

# Issued documents render as HTML through a headless Chromium in the app container

## Context and decision

Ticket 09 fixed that a Funding Request, a Fee Invoice and a Purchase Order each
produce a shareable document once Issued — from the frozen snapshot, on demand,
never stored, as a PDF (authoritative) plus a JPG of the same content. It left
*how* to the "Document rendering approach" ticket, which decided:

- **The document is an HTML page rendered by a headless Chromium**, driven by
  `puppeteer` (the full package, so a single npm dependency pins the Chromium
  version). One browser instance is launched lazily and kept warm for the life
  of the process.
- **Chromium runs inside the app container**, not in a companion sidecar. The
  container's memory floor rises to roughly 1 GB and its base image must install
  the DejaVu font package.
- **Each template is a React component** rendered to a static HTML string, over a
  shared shell, reusing the app's `--mm-*` brand tokens and the existing
  `formatTZS` / `formatDate` helpers.
- **The JPG is a second full-page screenshot** of the same HTML with page
  furniture suppressed — one continuous image, no separate PDF rasteriser.
- **Delivery is synchronous authenticated route handlers** (`document.pdf`,
  `document.jpg`) that stream the file; no queue, no temp storage.

## Why (the trade-off)

The lighter-looking choice is `@react-pdf/renderer`: pure JavaScript, no browser,
a small container image. We rejected it, and the sidecar, for specific reasons:

- **The documents are branded and client-held.** A Funding Request and a Fee
  Invoice are how the Engineer represents themselves to a paying client, and the
  client keeps the PDF as their record. The design system already exists as CSS.
  Chromium runs that CSS directly — real table layout, real page breaks, running
  headers — where `@react-pdf/renderer` would have us re-implement all of it in a
  flexbox subset and register fonts by hand.
- **The JPG falls out of the same engine.** Ticket 09 requires a single-image
  version for WhatsApp sharing. With Chromium that is one more `screenshot`
  call; with a JS PDF library it is a second native dependency (a PDF
  rasteriser) plus page-stitching logic.
- **The cold-start objection is already answered.** ADR 0001 fixed the app as
  one long-running container with a warm process. The browser is launched once
  and reused; document volume is a handful per Engineer per week. The usual
  reason to avoid Chromium — per-invocation launch cost on serverless — does not
  apply here.
- **A sidecar is a second service.** For a solo maintainer, `browserless/chrome`
  or a custom render service means another container to deploy, monitor, patch
  and version, and it enlarges the still-open deployment-shape decision. Crash
  isolation is not worth that at this volume; a page-pool cap, a per-render
  timeout and relaunch-on-crash contain a misbehaving render inside the one
  process.

## Consequences

- **The production image carries Chromium** (~300 MB) and its shared-library
  dependencies, and the app container needs ~1 GB RAM. Both are now inputs to
  the deployment-shape fast-follow on `.scratch/multi-tenancy/map.md`.
- **The base image must install `fonts-dejavu-core`** (or the platform
  equivalent) so the brand font renders; a missing font package is a silent
  fidelity regression, not an error.
- **`puppeteer`'s bundled Chromium version is bumped as a normal dependency
  update**, and each bump is a render-fidelity risk that the vocabulary/layout
  snapshot tests are there to catch.
- **"Amend this by editing the PDF" is not a thing** — the document is a pure
  function of the frozen snapshot (plus the current-profile letterhead). This is
  what makes a superseded Funding Request v1 still render v1 forever.
- **If render load ever needs to scale independently of the web tier**, the
  move is to the sidecar, and this ADR reopens. The template code does not
  change in that move; only where the browser lives does.
- **`@react-pdf/renderer` / `pdfkit` stay off the table** without reopening
  this ADR — adopting them means rewriting all three templates and the JPG path.
