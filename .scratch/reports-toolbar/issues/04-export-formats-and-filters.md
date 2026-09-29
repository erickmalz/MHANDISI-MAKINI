# Export formats and whether filters carry into them

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: erickmalz (Claude session, 2026-09-29)
Blocked by: 01, 02

## Question

Given what an exported report is (01) and which filters exist (02), which
formats does each report export to, and how?

- PDF (and JPG for WhatsApp) through the existing headless-Chromium document
  module (a new render kind that takes live figures, not a frozen snapshot)?
- A spreadsheet format (CSV or XLSX) for engineers who reconcile in Excel?
- Browser print only, like Financial Summary's print sheet today?

Does an export reflect the active filters, and does it state them on the
page (e.g. "Filtered: Stage 2 · Supplier: Depot")? This also decides how
Financial Summary's existing print sheet fits with any new PDF.

## Answer

**Every report exports as PDF, JPG and CSV, always exactly as filtered on
screen. Print means printing the PDF.** Resolved by the grilling design-tree
method. Each round's firm recommendation was taken as the decision, per the
standing preference in this map's Notes.

### Round 1: which formats

- **PDF: the main copy.** It goes through the existing document module
  (`web/src/lib/documents/`, headless Chromium, ADR 0005) as a new render
  kind, `report`. Its input is live report figures plus an "as of" time and
  the active filters, not a `document_snapshot`.
- **JPG: for WhatsApp.** It is the same page as one continuous image, because
  a JPG previews inline in a chat and a PDF doesn't. That is the same reason
  Issued Documents carry one. Long tables make tall images, so the export
  menu labels PDF as the better choice for long reports but still offers the
  JPG.
- **CSV: for spreadsheets.** It opens in Excel and Google Sheets with no new
  dependency, and the research shows phones can share it. XLSX is not built.
  It would add a library for formatting nobody asked for.

### Round 2: what the PDF and JPG look like

- **A4 landscape**, because report tables are wide. This follows Financial
  Summary's existing print sheet. The JPG uses the same landscape width.
- **The Issued Document shell** (letterhead from the current Account
  profile), carrying what [What an exported report is](./01-what-an-exported-report-is.md)
  requires: report and project name, the "As of {date, time} EAT" line, the
  footer "Live figures at the time shown. Not an invoice or request for
  payment.", and no number or status stamp.
- **Financial Summary keeps its "working ledger" layout** (the Notes column
  and the "Reviewed by / date" line) that its print sheet prototype chose for
  site meetings. Those are space to write on, not an issue signature, so they
  don't make it an Issued Document. The other five reports use a plain table
  layout: headline figures, the table, then the totals row.

### Round 3: do filters carry into exports?

**Yes, always.** An export reproduces exactly what the screen shows. The
export link carries the same search params the screen uses (from
[Which filters each report gets](./02-which-filters-each-report-gets.md)), so
there is one source of truth and no separate "export everything" choice. To
export the whole project, clear the filters first.

- PDF/JPG print the screen's **"Filtered: …" line** under the "As of" line,
  including "figures as of today" when a date range is active, and label the
  totals "Total (filtered)".
- CSV stays a clean table: one header row, the rows, then a final **Total**
  row. There are no metadata lines, which would break sorting and pivoting.
  The filename carries the context instead:
  `{Report}-{projectCode}-{YYYY-MM-DD}.csv`, with `-filtered` added when any
  filter is active. The same stem is used for the PDF and JPG.
- CSV amounts are plain whole shillings with no "TZS" and no thousands
  separators, so they stay numbers in a spreadsheet. Column headers are in
  the viewer's app language (English or Swahili).

### Round 4: how print fits

**Print opens the PDF,** and the browser or phone prints it. It is one
rendering path, so what prints is what exports. The five other reports get no
separate print sheets. Financial Summary's `window.print()` button and its
hidden `PrintSheet` are **retired** once its PDF carries the working-ledger
layout (Round 2).

### Round 5: delivery

Each report gets authenticated route handlers next to its page, e.g.
`reports/procurement/export.pdf|.jpg|.csv`. They read the same search params
and stream the file synchronously, like Issued Documents' `document.pdf` /
`document.jpg`. Nothing is stored or queued. How the file reaches the share
sheet in time (the research's 5-second tap window) is for
[What "share" means for a report](./05-what-share-means.md).

### Round 6: vocabulary

No new terms. PDF/JPG/CSV are formats of a **Report Export**, which
`CONTEXT.md` already defines.

### Consequences

- **The "Print for the other five reports" fog is cleared:** print = open
  the PDF. It is removed from the map.
- [What "share" means for a report](./05-what-share-means.md) is unblocked. It
  shares one of these three files.
- [Report toolbar layout](./06-report-toolbar-layout.md) is unblocked. Its
  actions are Export (PDF / JPG / CSV), Share and Print, alongside the
  filters.
