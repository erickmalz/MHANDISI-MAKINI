# Slice 2.7 — Document rendering (PDF + JPG) — handoff / scope

_Written session 01X8V6MU1w84mGhb766Lou5V (2026-09-09), picking up in a new
context window. Slices 2.1–2.6 are done, verified, pushed, on PR #2
(`phase2-domain-structure`, last commit `34824f3` + verification commits). No
open work on 2.6._

## What 2.7 is

Multi-tenancy **ticket 10** (`.scratch/multi-tenancy/issues/10-document-rendering-approach.md`,
**read it in full first** — it is the spec) and **ADR 0005**
(`docs/adr/0005-html-to-pdf-via-headless-chromium.md`). Turn the three Issued
records into shareable documents:

- **Issued Funding Request** (client-facing) — incl. the `v2` suffix and a
  `SUPERSEDED` / `CANCELLED` diagonal stamp.
- **Fee Invoice** (client-facing) — `PAID — {date}` stamp when paid, delta-invoice
  wording, "billed separately from project funds" line.
- **Issued Purchase Order** (supplier-facing) — `CANCELLED` stamp; **no**
  Commitment State or delivered/paid progress (the order as issued, not a
  tracker).

Each renders **on demand, never stored**, from its frozen `document_snapshot`
JSONB (written at Issue in slices 2.5 / 2.6) — the renderer never reads the live
`projects` / `suppliers` / `*_lines` tables. A4, English only.

Delivery: **A4 PDF (authoritative) + one continuous JPG** of the same content
(`page.screenshot({ fullPage: true, type: "jpeg", quality: 90 })` at ~2× with a
`screenshot` body class that drops `@page` margins + running headers). JPG, not
PNG — it previews inline in WhatsApp.

## ⚠️ Open questions — settle with the user BEFORE writing code

1. **Verification story (the real blocker).** This dev box is WSL with
   Windows-built `node_modules` and no Docker — it already cannot run
   `next build`, `drizzle-kit`, or the Testcontainers suite (see the env note in
   `status.md`). Headless Chromium via `puppeteer` is the same class of problem:
   the Chromium binary download and launch are Windows-side / CI only. Options to
   put to the user:
   - build the templates + route handlers + snapshot-vocabulary test in WSL
     (all of that is pure TS/React and `renderToStaticMarkup` runs fine), and
     lean entirely on Windows-side `npm run dev` + CI for the actual
     Chromium render;
   - add a CI job that renders a fixture snapshot and asserts the PDF/JPG come
     back non-empty (no pixel diff — too brittle for a solo maintainer);
   - whether a golden-file / visual check is wanted at all in v1.
2. **`Dockerfile` — does it land in 2.7 or wait?** Ticket 10 §5 hands the build
   "the Dockerfile lines (Chromium deps + `fonts-dejavu-core`)", but **there is
   no app `Dockerfile` in the repo yet** and the map's *Deployment-shape* fog is
   still open. Likely answer: 2.7 adds a `web/Dockerfile` that installs Chromium
   deps + `fonts-dejavu-core` and documents the ~1 GB RAM floor, even though the
   full deploy pipeline is a later decision — but confirm the user wants the
   Dockerfile now vs. a `.scratch` note handed to the deployment slice.
3. **Letterhead identity — `accounts` is missing columns.** Ticket 10 §3 wants
   the letterhead to render **name, phone, email, logo** from the *current*
   Account profile (not the snapshot). `accounts` today has only `full_name` and
   `phone` (`web/src/lib/data/schema/accounts.ts`) — **no `email`, no `logo`**.
   Slice 2.8 is scoped to add "profile edit (name/phone/logo for the
   letterhead)". Decide: does 2.7 render the letterhead from `full_name` + `phone`
   only (logo/email come with 2.8), or does 2.7 pull the `logo` column +
   migration forward from 2.8? Recommendation: **name + phone now**, logo/email
   with 2.8 — keeps 2.7 migration-free.
4. **Is there a migration at all?** The `document_snapshot` column already exists
   (jsonb, `0003`). Ticket 10 §8's `FI-{project}-NNN` sequence is **already
   built** (2.5 — `document_number_type` enum has `fee_invoice`,
   `claimDocumentNumber` mints it). So 2.7 is likely **code-only** unless (3)
   pulls the `accounts.logo` column forward. Confirm.

## What is already in place (don't rebuild)

- **`web/src/lib/data/schema/snapshot.ts`** — the `DocumentSnapshot` /
  `DocumentSnapshotSection` / `DocumentSnapshotLine` shape. Ticket 10 §3 says
  "the build owns the exact JSON shape and its type" and the 2.5 runbook says it
  is "loose for now, tightened in 2.7" — so **tightening this type + the three
  Issue paths that write it is part of 2.7**. Current writers:
  - `web/src/lib/data/funding.ts` — `buildFundingRequestSnapshot`,
    `buildFeeInvoiceSnapshot` (in `issueFundingRequest`).
  - `web/src/lib/data/procurement.ts` — the inline snapshot in
    `issuePurchaseOrder`.
  Check each against ticket 10 §7's content checklist and add any missing field
  (e.g. FR `supersedes` is there; Fee Invoice `feeBasis` / `basisValue` are in
  the snapshot already; PO has `paymentInstructions` = terms).
- **Number formats** — `FR-{code}-NNN` (+ ` v{n}`), `FI-{code}-NNN`,
  `PO-{code}-NNN`, all frozen onto the record's `displayNumber` and into the
  snapshot's `displayNumber`.
- **Format helpers** — `formatDate` in `web/src/lib/format.ts` ("06 Sep 2026"),
  **`formatTZS` in `web/src/lib/finance.ts`** (line 88). Ticket 10 §2: money +
  dates only through these. `@/lib/finance` is not `server-only`; `@/lib/format`
  is plain.
- **Brand tokens** — `web/src/app/globals.css` holds the `--mm-*` design tokens.
  Ticket 10 §2: the print stylesheet **imports / reuses** them, never
  re-declares a brand hex. The `mhandisi-makini-design-system` skill has the
  brand rules (Site Yellow / Charcoal, "Let's build together").
- **Auth + tenancy** — route handlers go under `web/src/app/(app)/…` so
  `verifySession` + `withAccount` + RLS already scope the snapshot read
  (`web/src/lib/data/account-context.ts`, `with-account.ts`). Read the DAL
  (`getFundingRequest`, `getPurchaseOrder`, and a Fee Invoice getter — **check
  if one exists**; `markFeeInvoicePaid` is wired but there may be no
  `getFeeInvoice` read yet).

## Suggested build shape (for the user to react to)

- `web/src/lib/documents/` — the render module:
  - `browser.ts` — lazy singleton `puppeteer` browser, page pool, relaunch on
    crash, hard per-render timeout, in-process concurrency gate (~2–3).
  - `render.ts` — `renderToStaticMarkup(<Template snapshot={…} profile={…} />)`
    → HTML string → `page.setContent` → `page.pdf({ format: "A4" })` /
    `page.screenshot({ fullPage: true, type: "jpeg" })`.
  - `templates/` — `Shell.tsx` (letterhead + footer + table system + stamp),
    `FundingRequestDoc.tsx`, `FeeInvoiceDoc.tsx`, `PurchaseOrderDoc.tsx`,
    `print.css` (inline, `--mm-*` tokens, `@page`, `break-inside: avoid`,
    `.screenshot` variant).
- Route handlers (per ticket 10 §6 — `document.pdf` + `document.jpg`, streamed
  with `Content-Disposition: attachment`, 503 over the gate/timeout):
  - `web/src/app/(app)/projects/[id]/funding/[frId]/document.pdf/route.ts` (+ `.jpg`)
  - `web/src/app/(app)/projects/[id]/procurement/[poId]/document.pdf/route.ts` (+ `.jpg`)
  - Fee Invoice — its own route; decide the URL (it has no standalone page yet —
    maybe `…/funding/[frId]/fee-invoice.pdf`, since a FI is 1:1-ish with an FR).
- Download buttons on `FundingRequestDetail` / `PurchaseOrderDetail` (and a Fee
  Invoice link) — only when the record is Issued (`displayNumber != null`).
- `web/Dockerfile` — see open question 2.
- Tests: a vocabulary snapshot test (ticket 10 §2 — canonical labels + number
  formats render from a fixture snapshot); `renderToStaticMarkup` only, no
  browser, so it runs in WSL + CI.

## Env constraint (unchanged, still governs)

WSL runs `tsc` + `eslint` only. `build` / `test` / `drizzle-kit` / **now also
any real Chromium render** are Windows-side or CI, driven by a per-slice runbook
under `.scratch/phase2/`. One commit per slice, same runbook pattern.

## Relevant saved memories

- `mhandisi-makini-issued-documents-need-pdf-and-jpg-export` — every outward
  issued record downloadable as **both** PDF and JPG. This slice is that.
- `mhandisi-makini-verify-migration-before-building-on-it` — if open question 3
  pulls `accounts.logo` forward, land + verify that migration first.
- `mhandisi-makini-one-project-at-a-time` — the documents are per-record, fine.
- `mhandisi-makini-every-account-starts-empty` — letterhead must degrade
  gracefully when the Account has no logo (ticket 10 §3 says fall back to the
  business name as text).
