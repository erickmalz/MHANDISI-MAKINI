# Document rendering approach for issued Funding Requests, Fee Invoices and Purchase Orders

Type: grilling
Status: resolved
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

## Answer

### 0. One line through all of it

A document is an **HTML page rendered by a headless Chromium that lives in the
app container**, printed to PDF and screenshotted to JPG. The template is a
React component; its only transactional input is the immutable snapshot frozen
at Issue (ticket 09 §6); its letterhead comes from the Engineer's current
Account profile. Nothing is stored — each download re-renders.

This ticket fixes the engine, the template mechanism, the JPG path, the
operational placement, the invocation model, and the required content of each of
the three documents. The build owns the DDL for the snapshot column, the exact
React markup and print CSS, the Dockerfile lines, and the route wiring.

### 1. Rendering engine — HTML/CSS → PDF via headless Chromium

- **`puppeteer`** (the full package, so one npm dependency pins the Chromium
  version — nothing to bump separately in the image). A **single browser
  instance is launched lazily on the first render and kept warm** for the life
  of the process; renders borrow a page from a small pool and return it. The
  browser is relaunched if it crashes or a render exceeds a hard timeout.
- **Chosen over `@react-pdf/renderer`** because the documents are branded
  (decision below): Chromium runs the real `globals.css` design tokens, real
  table layout, real page-break control (`@page`, `break-inside: avoid`,
  `position: fixed` running headers), and the JPG falls out of the same engine
  for free. `@react-pdf/renderer`'s lighter image is spent immediately
  re-implementing all of that in its flexbox subset and bolting on a separate
  PDF rasteriser for the JPG.
- **Chosen over `pdfkit` / `pdf-lib`** (too low-level for a designed document)
  and **over Typst / wkhtmltopdf** (a second toolchain / a dead WebKit for a
  solo maintainer).
- The cold-start cost that made this a real question is **removed by ticket
  05's shape** — one long-running container, warm browser, a handful of
  documents per Engineer per week.
- **Page size: A4** (Tanzania standard).
- Recorded as
  [ADR 0005](../../../docs/adr/0005-html-to-pdf-via-headless-chromium.md).

### 2. Template mechanism — a React component rendered to a static string

- Each document type is a **React Server Component** rendered with
  `renderToStaticMarkup` to an HTML string, wrapped in a shared shell
  (letterhead, footer, table system) so the three templates differ only in the
  body. No templating language, no `.hbs` files.
- The print stylesheet is a **dedicated inline stylesheet** that reuses the same
  `--mm-*` brand tokens as `globals.css` (imported, not re-declared — the brand
  rule "never hardcode a brand hex" still holds).
- **Money and dates are formatted only through the existing `formatTZS` and
  `formatDate` helpers** — one formatting path, shared with the app screens.
- **Sync with `finance.ts` is structural, not manual**: the template displays
  fields off the snapshot, and the snapshot is written by the same server path
  that computes the figures via `finance.ts` at Issue — the numbers cannot
  drift because the template never computes anything.
- **Sync with `CONTEXT.md` vocabulary is pinned by a snapshot test** that
  asserts the canonical labels render ("Available Float" is not shown here, but
  "Deposit", "Fee Invoice", "Purchase Order", the `FR-{project}-NNN` /
  `PO-{project}-NNN` / `FI-{project}-NNN` number formats, "billed separately
  from project funds").

### 3. Snapshot → render data contract

- **The Issue transaction writes a self-contained `document_snapshot` (a JSONB
  column)** holding every value the document displays, fully resolved: the
  assigned number, issue date, project name, client name, site, stage name,
  every line item with its computed line total, all section subtotals and the
  grand total, the fee line, payment instructions, notes, and (for a superseding
  Funding Request) the superseded number and revision reason.
- **The renderer reads only the snapshot** for transactional content — never the
  live `projects`, `suppliers`, `funding_request_lines`, … tables. A later edit
  to a Supplier's name in the register, or a change to a `finance.ts` formula,
  therefore cannot rewrite a document that was already issued.
- **Exception — letterhead identity.** The Engineer's / business name, phone,
  email and logo render from the **current** Account profile, not the snapshot:
  a corrected phone number or a new logo is the Engineer representing
  themselves, not a term of the deal, and should apply to past documents. If the
  Account has no logo yet (a new Account starts empty), the letterhead falls
  back to the business name set as text.
- The build owns the exact JSON shape and its TypeScript type; ticket 08 owns
  the column DDL.

### 4. PDF → JPG — a second full-page screenshot

- The JPG is produced by **rendering the same HTML a second time with a
  `screenshot` body class** that suppresses `@page` margins and running
  headers, then `page.screenshot({ fullPage: true, type: "jpeg", quality: 90 })`
  at A4 width scaled ~2× for crispness, on a white background.
- The result is **one continuous image of the whole document**, regardless of
  page count, with no repeated page furniture — this is ticket 09's "same
  rendered pages as a single image". No PDF rasteriser, no image-stitching step,
  no extra native dependency.
- JPG (not PNG) per ticket 09 — it previews inline in WhatsApp, which is the
  point of having it.

### 5. Operational placement — in the app container

- **Chromium runs in the same container as the Next app**, as the in-process
  singleton browser above. This matches ticket 05's "one long-running container
  with a volume" exactly and does **not** add a second service to the still-open
  Deployment-shape decision.
- A **companion sidecar** (`browserless/chrome` or similar) was rejected: crash
  isolation is not worth a second container to deploy, monitor and version at
  this volume, for a solo maintainer.
- **Feeds one constraint to the Deployment-shape fast-follow**: the app
  container needs roughly **1 GB RAM** (≈300 MB image weight for Chromium plus
  browser working memory), and its base image must install the DejaVu font
  package (`fonts-dejavu-core` on Debian) so the brand font is available to
  Chromium.
- Guard rails owned by the build: a page-pool cap, relaunch-on-crash, a hard
  per-render timeout, and an in-process concurrency gate (≈2–3 concurrent
  renders) so a burst cannot exhaust browser memory.
- **Reopens → sidecar** only if render load ever needs to scale separately from
  the web tier.

### 6. Invocation — synchronous authenticated route handlers

- Two Route Handlers per document, under the authenticated `(app)` segment so
  the session check and `withAccount` context already apply and RLS scopes the
  snapshot read:
  `…/document.pdf` and `…/document.jpg`.
- The handler loads the snapshot, renders, and **streams the file in the
  response** with `Content-Disposition: attachment` — no temp file, no storage,
  no cleanup job, consistent with ticket 09's "on demand, never stored".
- Over the concurrency gate or the render timeout → **HTTP 503 with a "try
  again" message**.
- **No queue / job system** — unjustified at this volume and it would
  reintroduce storage.
- These routes are **authenticated only**. A tokenised public link (client opens
  a document with no login) stays deferred, as ticket 09 fixed.

### 7. Required content of each document

Ticket 10 pins the content checklist; the build owns layout, spacing and exact
wording. All three carry the letterhead (§3 exception) and, where applicable, a
diagonal status stamp.

**Funding Request** (client-facing — guidelines §18 plus the rules below):
project, client, site, stage, request number (`FR-{project}-NNN`, with the
`v2` suffix when it is a superseding version), issue date, material breakdown
(line items), labour breakdown (line items), **supervisor fee shown as a line**
for transparency — labelled as billed separately through the Fee Invoice, never
drawn from deposits (Phase 1 Fee Collection Method), other approved charges,
total requested, notes, payment instructions. When it is a v2+: a
"Supersedes `FR-{project}-NNN` v1 — reason: …" line. **Stamp:** `SUPERSEDED` or
`CANCELLED` when the record is in that state.

**Fee Invoice** (client-facing — no guidelines section defines this; fixed
here): document title "Fee Invoice", **number `FI-{project}-NNN`** (a new
per-project sequence — see §8), issue date, project, client, stage, the **linked
Funding Request number** (`FR-{project}-NNN v2`), the **fee basis** (percentage
or fixed amount, and the figure it is computed on, e.g. "3.5% of stage value
TZS 12,000,000"), the **fee amount** (invoice total, TZS), fee payment
instructions, and an explanatory line: "This fee is billed separately from the
project funds in Funding Request `FR-{project}-NNN`. It is not paid from your
project deposits." When it is a delta follow-up: "Follow-up to
`FI-{project}-NNN` for the revised fee on `FR-{project}-NNN` v2 — delta only."
**Stamp:** `PAID — {date}` when the Fee Invoice status is Paid (it doubles as
the receipt); `SUPERSEDED` when it was reissued alongside an unpaid superseded
Funding Request.

**Purchase Order** (supplier-facing — guidelines §22 minus lifecycle status):
document title "Purchase Order", number `PO-{project}-NNN`, issue (order) date,
deliver-to site name / address, supplier name and contact (from the snapshot),
payment terms (from the snapshot), expected delivery date, material lines
(description, quantity ordered, unit, unit price, line total), order total
(TZS), notes. **Not shown:** the Commitment State, or delivered / paid progress
— the document is the order as issued, not a live tracker. **Stamp:**
`CANCELLED` when the PO is Cancelled (POs never supersede, so there is no
`SUPERSEDED` stamp).

### 8. Numbering — a small extension of ticket 09 §5

Ticket 09 fixed per-project sequences for Funding Requests (`FR-{project}-NNN`)
and Purchase Orders (`PO-{project}-NNN`). The **Fee Invoice needs its own**:
`FI-{project}-NNN`, a separate per-project sequence, minted inside the same
atomic transaction that raises the Fee Invoice — the Funding Request Issue
transaction, or the supersede / Additional Funding Request transaction for a
follow-up. Same rules as ticket 09: assigned at creation, immutable, never
reused.

### 9. Language

**English only for v1.** Every field name in the guidelines and `CONTEXT.md` is
English; a bilingual template triples to six the surface that must stay in sync.
The snapshot-driven design makes a Swahili template purely additive later if
Engineers ask for it.

### 10. Scope line

**This ticket fixes:** the engine (`puppeteer` + warm in-container Chromium),
the template mechanism (React → static markup + shared shell + reused `--mm-*`
tokens + existing format helpers), the snapshot-only data contract with the
current-profile letterhead exception, the JPG path (second full-page
screenshot), the operational placement (app container, ~1 GB RAM, DejaVu font
package), the invocation model (synchronous authenticated route handlers, no
storage, no queue), the required content of all three documents, the
`FI-{project}-NNN` numbering, and English-only.

**Handed to the build:** the `document_snapshot` JSONB shape and its type, the
three React templates and the print CSS, the `screenshot` body-class variant,
the Dockerfile lines (Chromium deps + `fonts-dejavu-core`), the browser
singleton / page pool / concurrency gate / timeout, the two route handlers, and
the vocabulary snapshot test.

**Interacts with the map's Deployment-shape fog:** the app container's memory
floor (~1 GB) and font-package requirement are now inputs to that fast-follow.
