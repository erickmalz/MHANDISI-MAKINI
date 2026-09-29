# Reports — Filters, Export, Share & Print — Decision Map

Wayfinder decision map. Tracker: local markdown (`.scratch/reports-toolbar/`).
Label: `wayfinder:map`. Started 2026-09-29.

## Destination

**Status: reached 2026-09-29.** Every ticket is resolved and nothing is left in the fog. Ready to hand off to a build.

A build-ready spec for filtering, exporting, sharing and printing the six
per-project report screens (Financial Summary, Material Cost, Procurement,
Labour, Funding, Variations — `web/src/app/(app)/projects/[id]/reports/`),
plus the Supplier and Subcontractor Statements, which joined via their own ticket.
Reaching the end means every ticket below has a recorded answer and a build
can start without guessing. **This map produces decisions, not code.**

## Notes

- **Reopens a settled decision.** Phase 4 map, ticket
  [Advanced Reporting Dashboard](../phase4/issues/06-advanced-reporting-dashboard.md)
  ruled "no PDF/JPG export" for these screens because they are live views,
  not Issued Documents. The user has now asked for export, share and print,
  so "What an exported report is" deliberately reopens that ruling. It does not reopen the
  one-project-at-a-time rule; see Out of scope.
- **Build state this map is written against**: six read-only report screens
  read from `web/src/lib/data/reports.ts` (pure re-use of `finance.ts` /
  `funding.ts` / `procurement.ts` derivations). No report has filters today.
  Only Financial Summary has output: a browser `window.print()` button with a
  hidden landscape "working ledger" `PrintSheet`. The issued-document module
  (`web/src/lib/documents/`, headless-Chromium PDF + JPG, ADR 0005) renders
  only frozen `document_snapshot`s today. Filtering precedent: Activity
  History's `?stage=` search param.
- **Skills to consult**: `grilling` + `domain-modeling` on every grilling
  ticket; `prototype` for the prototype ticket; `research` for research
  tickets. For UI decisions also the `mhandisi-makini-design-system` skill.
- **Decision-maker**: per the standing preference on this project (memory
  `mhandisi-makini-grilling-accept-recommendations`), each grilling ticket is
  resolved by taking the firm recommendation, not by re-asking every round.
- **Relevant memories**: `mhandisi-makini-one-project-at-a-time`,
  `mhandisi-makini-issued-documents-need-pdf-and-jpg-export`.
- Tickets carry `Type:`, `Status:`, `Assignee:` (the claim) and
  `Blocked by:` headers. The local tracker has no native blocking, so the
  `Blocked by:` line is the body convention.

## Tickets

1. [What an exported report is](./issues/01-what-an-exported-report-is.md) — grilling (resolved)
2. [Which filters each report gets](./issues/02-which-filters-each-report-gets.md) — grilling (resolved)
3. [Mobile file-sharing support](./issues/03-mobile-file-sharing-support.md) — research (resolved)
4. [Export formats and whether filters carry into them](./issues/04-export-formats-and-filters.md) — grilling (resolved)
5. [What "share" means for a report](./issues/05-what-share-means.md) — grilling (resolved)
6. [Report toolbar layout](./issues/06-report-toolbar-layout.md) — prototype (resolved)
7. [Do the Supplier and Subcontractor Statements get the report toolbar?](./issues/07-statements-join-the-toolbar.md) — grilling (resolved)

## Decisions so far

<!-- one line per closed ticket: [title](link): gist -->

- [Mobile file-sharing support](./issues/03-mobile-file-sharing-support.md):
  Phones can hand a PDF/JPG/CSV straight to the share sheet (Web Share with
  files: Android Chrome, Samsung Internet, all iOS 14+), but only if the file
  is ready before the tap. Firefox, some desktops and in-app browsers need a
  download fallback. A WhatsApp link can carry text or a URL, never a file.
- [What an exported report is](./issues/01-what-an-exported-report-is.md):
  A Report Export is an on-demand, dated ("As of …") rendering of live
  figures on the Engineer's letterhead. It is never stored or numbered and
  is not an Issued Document. Anyone the Engineer chooses may receive it, and
  there is no redacted variant. Reverses only the export half of Phase 4
  "Advanced Reporting Dashboard".
- [Which filters each report gets](./issues/02-which-filters-each-report-gets.md):
  Stage filter everywhere, plus the dimensions each report's rows already
  carry (supplier, subcontractor, status, kind, issued/requested date range),
  one value each. Totals always recompute over the rows shown. Filters live in
  the URL search params. Dates select rows in range with money shown current
  to today.
- [Export formats and whether filters carry into them](./issues/04-export-formats-and-filters.md):
  PDF (the main copy, A4 landscape on the letterhead), JPG (for WhatsApp)
  and CSV (for spreadsheets, no XLSX). Every export reproduces exactly the
  filtered screen. Print = open the PDF, and Financial Summary's separate
  print sheet is retired into its PDF.
- [What "share" means for a report](./issues/05-what-share-means.md):
  Share sends the exported file (the Engineer picks PDF, image or CSV) to the
  phone's share sheet, never a link. Tapping a format fetches that file and,
  if slow, turns into "Ready: tap to share". Share is shown only where
  browsers can share files, falls back to download, and sends a title only.
- [Report toolbar layout](./issues/06-report-toolbar-layout.md): One toolbar
  row: "Filters (n)" opens a bottom sheet on phones and a side panel on
  desktop, a yellow Share is the primary, and "More" holds Export
  PDF/JPG/CSV and Print. Active filters show as removable chips above the
  "Filtered: …" line. Same toolbar on all six reports. Prototype: branch
  `prototype/report-toolbar-2026-09`, screenshots in `./prototype/`.
  Confirmed by the user after review on a Pixel 10.
- [Do the Supplier and Subcontractor Statements get the report toolbar?](./issues/07-statements-join-the-toolbar.md):
  Yes, the same toolbar. A sent Statement is a Report Export addressed to
  the counterparty. It stays Account-wide by default, with Project, status
  and date filters. The CSV is one dated Charged/Paid ledger. Delivers
  Operational Control's deferred statement export. Confirmed by the user.

## Not yet specified

<!-- Empty. Every patch graduated into a ticket and every ticket is
resolved: the destination is reached (2026-09-29). -->

## Out of scope

- **Cross-project or combined reports.** Every report stays scoped to one
  open project (memory `mhandisi-makini-one-project-at-a-time`; Phase 4
  ticket 06 recorded §39's aggregate dashboard as permanently out).
- **Scheduled or emailed reports.** The request is on-demand filter, export,
  share and print. Automatic delivery is a separate effort.
- **Audience-specific or redacted report versions.** A Report Export goes to
  whoever the Engineer chooses, as-is. See
  [What an exported report is](./issues/01-what-an-exported-report-is.md).
- **Reports "as of a past date".** Recomputing a project's position as it
  stood on an earlier date needs a history the live read model doesn't keep.
  Date filters select rows in range instead, and a Report Export is the dated
  record. See [Which filters each report gets](./issues/02-which-filters-each-report-gets.md).
- **Shareable report links.** A no-login link would put one Account's figures
  outside the Account (tokenised public links were deferred on the
  multi-tenancy map) and would show live, not dated, figures. Share sends the
  file instead. See [What "share" means for a report](./issues/05-what-share-means.md).
- **Share on Issued Documents.** Funding Requests, Fee Invoices, Purchase
  Orders and closeout reports stay download-only here; a natural follow-up
  effort, with the Share control built reusable for it. See
  [What "share" means for a report](./issues/05-what-share-means.md).
- **New report types or new figures.** This map adds controls to the existing
  six reports and does not change what they calculate.
