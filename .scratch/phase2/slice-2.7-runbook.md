# Slice 2.7 runbook — Document rendering (PDF + JPG)

_Multi-tenancy ticket 10 / ADR 0005. One commit for the slice, same pattern as
2.5 / 2.6. **Code-only — no migration.** WSL runs `tsc` + `eslint`; `build`,
`vitest`, and any real Chromium render are Windows-side or CI._

## Decisions taken with the user (2026-09-09/10)

1. **Verification: local dev only.** WSL builds the templates / routes / snapshot
   changes and the vocabulary test. The real Chromium render is checked by
   running `npm run dev` on Windows and downloading each document. No CI render
   job, no golden-file check in v1.
2. **`web/Dockerfile` lands now** (provisional). It captures the Chromium deps +
   `fonts-dejavu-core` + the ~1 GB RAM floor. The deployment-shape slice owns
   final hardening / image-slimming — the file says so at the top.
3. **Letterhead: name + phone only.** `accounts` has `full_name` + `phone`
   today; logo + email arrive with Slice 2.8's profile-edit work. The template
   already renders name-only gracefully.
4. **No migration.** `document_snapshot` (jsonb) and the `FI-{project}-NNN`
   sequence already exist. 2.7 only *tightens* the snapshot TypeScript type and
   the three Issue paths that write it.

## What changed

### Snapshot contract (tightened, ticket 10 §3)
- `web/src/lib/data/schema/snapshot.ts` — `DocumentSnapshot` is now a
  `kind`-discriminated union: `FundingRequestSnapshot` (adds `feeAmount`),
  `FeeInvoiceSnapshot` (adds `fundingRequestNumber`, `feeBasis` / `feePercent`
  / `basisValue`, `isDelta`, `parentNumber`), `PurchaseOrderSnapshot` (adds
  `supplierContact`, `expectedDeliveryOn`).
- `web/src/lib/data/funding.ts` — `buildFundingRequestSnapshot` drops the fee
  *section* (now a stand-alone `feeAmount` field the template renders as a
  "billed separately" line); `buildFeeInvoiceSnapshot` takes the new fields;
  the `feeInvoiceSnapshot(fiNumber, { isDelta, parentNumber, feeAmount })`
  closure threads them through the three raise paths.
- `web/src/lib/data/procurement.ts` — `issuePurchaseOrder` selects
  `suppliers.phone` and freezes `supplierContact` + `expectedDeliveryOn` into
  the snapshot.

### Render module (`web/src/lib/documents/`)
- `browser.ts` — lazy singleton `puppeteer` browser, relaunch on `disconnected`,
  `closeBrowser()` for shutdown/tests. Dynamic `import("puppeteer")` so it stays
  external (see `next.config.ts`).
- `render.ts` — `renderPdf` / `renderJpg` off a page from the warm browser.
  In-process concurrency gate (2 active + 4 waiting → `RenderUnavailableError`),
  20 s hard per-render timeout, page closed in `finally`. PDF: A4,
  `displayHeaderFooter` with a charcoal footer ("Let's build together · page
  X / Y"). JPG: viewport 794×1123 @2×, `fullPage`, `type: "jpeg"`, `quality: 90`.
- `print-css.ts` — `PRINT_CSS`: the `--mm-*` primitives copied **verbatim** from
  `.claude/skills/mhandisi-makini-design-system/references/tokens.css` (the same
  sanctioned copy `globals.css` makes), plus the document layout, `@page`, the
  diagonal `.stamp`, and the `body.screenshot` variant.
- `templates/parts.tsx` — `Shell` (letterhead + heading + meta grid + footer +
  stamp), `SectionTable`, `GrandTotal`, `Callout`, `TextBlock`. Money / dates
  via `formatTZS` / `formatDate` only.
- `templates/{FundingRequestDoc,FeeInvoiceDoc,PurchaseOrderDoc}.tsx` — one per
  document, content per ticket 10 §7.
- `templates/render-html.tsx` — `renderDocumentHtml(doc, { screenshot? })` →
  full HTML string via `renderToStaticMarkup`.
- `index.ts` — `renderDocument(doc, "pdf" | "jpg")` → `{ bytes, contentType,
  filename }` (filename from the frozen number).
- `response.ts` — `serveDocument(load, belongsToRoute, format)`: session gate
  (DAL `NotAuthenticatedError` → 404, since Route Handlers skip the `(app)`
  layout), cross-account / missing / draft → 404, render overload → 503,
  otherwise streamed `attachment` with `Cache-Control: private, no-store`.

### Read DAL (`web/src/lib/data/documents.ts`, new)
- `getDocumentProfile()` → `{ businessName, phone }` from the live Account.
- `getFundingRequestDocument(frId)` / `getFeeInvoiceDocument(frId)` /
  `getPurchaseOrderDocument(poId)` → `{ kind, projectId, snapshot, stamp,
  profile } | null`. `stamp` derived from the **live** row status:
  FR `superseded`/`cancelled` → `SUPERSEDED`/`CANCELLED`; FI `paid` →
  `PAID — {date}`, `supersededAt` → `SUPERSEDED`; PO `cancelled` → `CANCELLED`.
- Re-exported from `web/src/lib/data/index.ts`.

### Routes (authenticated `(app)` segment)
- `projects/[id]/funding/[frId]/document.pdf|.jpg/route.ts`
- `projects/[id]/funding/[frId]/fee-invoice.pdf|.jpg/route.ts`
- `projects/[id]/procurement/[poId]/document.pdf|.jpg/route.ts`

### UI
- `web/src/components/DocumentDownloads.tsx` — a card with PDF + JPG links per
  document.
- `FundingRequestDetail` (FR + Fee Invoice) and `PurchaseOrderDetail` (PO) show
  it once `displayNumber != null`.

### Build / deploy
- `web/package.json` — `puppeteer ^24.14.0`.
- `web/next.config.ts` — `puppeteer` added to `serverExternalPackages`.
- `web/Dockerfile` — provisional multi-stage image (Chromium deps +
  `fonts-dejavu-core`, `PUPPETEER_CACHE_DIR`, standalone output).
- `web/vitest.config.ts` — `@` alias + automatic JSX + `tests/**/*.test.{ts,tsx}`
  so the pure-render test runs without a container.
- `web/tests/documents/vocabulary.test.tsx` — vocabulary / number-format lock.

## WSL checks done

- `npx next typegen` — ✓ (needed for the `RouteContext` literals).
- `npx tsc --noEmit` — clean **except** three
  `Cannot find module 'puppeteer'` errors in `browser.ts` / `render.ts`. Those
  clear once `npm install` runs where `puppeteer` can install (Windows / CI).
- `npx eslint` over every touched path — ✓.
- `npx vitest run` — cannot run in WSL (rolldown native binding, same as the
  isolation suite). Windows / CI only.

## Windows-side / CI steps (in order)

1. `cd web && npm install` — pulls `puppeteer` + downloads its Chromium
   (~150 MB). First run only.
2. `npm run typecheck` — must be fully clean now (puppeteer resolved).
3. `npm run lint` — clean.
4. `npm test` — the isolation suite (unchanged; the snapshot-writer edits go
   through it via the 2.5 / 2.6 Issue-transaction tests) **plus** the new
   `tests/documents/vocabulary.test.tsx`. All green.
5. `npm run build` — standalone build succeeds with `puppeteer` external.
6. `npm run dev`, then for a project that has an **issued** FR, its Fee Invoice,
   and an **issued** PO:
   - open each detail screen, confirm the **Documents** card appears
   - download all six files; confirm:
     - the PDF is A4, branded (Site Yellow rule, charcoal total bar, DejaVu),
       footer shows "page X / Y"
     - the JPG is one continuous image, no repeated page furniture
     - the letterhead shows the Account name + phone
     - a superseded FR shows the diagonal `SUPERSEDED` stamp; a paid Fee Invoice
       shows `PAID — {date}`; a cancelled PO shows `CANCELLED`
     - the Fee Invoice says "billed separately from the project funds in
       Funding Request FR-…"
   - a **draft** FR / PO detail screen has **no** Documents card, and hitting a
     `document.pdf` URL for a draft returns 404
7. CI on the PR (`lint` / `typecheck` / isolation suite / `build`) green.

## Commit

Single commit: `Phase 2 Slice 2.7: issued-document rendering (PDF + JPG)`.
Then the verification commit once CI is green, per the 2.5 / 2.6 pattern.
