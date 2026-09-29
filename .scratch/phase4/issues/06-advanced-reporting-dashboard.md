# Advanced Reporting Dashboard

Type: grilling
Status: resolved

## Question

Guidelines §38 lists eight reports (Project Financial Summary, Material
Cost, Procurement, Labour, Funding, Variation, Supplier Statement,
Subcontractor Statement, Stage Closeout Report); §39 additionally wants a
home-dashboard aggregation across **all** projects (Active projects, Total
client funds held, Total project commitments, Total available float, Total
outstanding supplier/subcontractor liabilities, Total expected fees, Total
funding shortfall). But the Choose Project page
(`web/src/app/(app)/page.tsx`) already carries an explicit, shipped
architectural rule in its own doc comment: "the picker identifies each
project and flags which ones need attention, but never shows project
figures side by side" — the one-project-at-a-time foundation the
multi-tenancy map fixed and every later map has treated as non-reopenable
(see the memory `mhandisi-makini-one-project-at-a-time`). §39's combined
totals directly conflict with that. What does Phase 4 actually build?

## Answer

> **Superseded in part (2026-09-29):** the "no PDF/JPG export" ruling below
> is reversed by [What an exported report is](../../reports-toolbar/issues/01-what-an-exported-report-is.md)
> on the Reports filters/export/share/print map. Reports may now leave the app
> as a dated Report Export. The rest of this answer stands.

**Per-project reports: yes, all six not already covered.** Supplier
Statement and Subcontractor Statement already ship (Operational Control
decision 5); Stage Closeout Report is ticket 03. This ticket builds the
remaining six as **live, read-only, per-project screens** — Project
Financial Summary, Material Cost Report, Procurement Report, Labour Report,
Funding Report, Variation Report — each reading straight off `finance.ts`
and the already-built per-record data (Budget Variance, Material Stock,
Reconciliation Engine, Variation module all already compute most of these
figures individually; this ticket is presentation, not new calculation).
Same document class as Supplier/Subcontractor Statements: **no PDF/JPG
export** — these are always-current analytical views, not frozen issued
records, so the memory `mhandisi-makini-issued-documents-need-pdf-and-jpg-
export` doesn't apply to them (only genuinely *issued* documents — Funding
Request, Fee Invoice, PO, and tickets 03/04's closeout reports — get
PDF/JPG).

**§39's cross-project aggregate dashboard: not built.** It's superseded by
the already-settled one-project-at-a-time rule, not merely descoped for
lack of time — building it would directly contradict a decision this
product has already shipped and stood behind through three prior maps.
Every report in this ticket, and the existing Choose Project page, stays
scoped to at most one open project. The guideline's own caveat ("dashboard
totals may aggregate... but funds must never be treated as transferable
between projects") shows §39's authors anticipated the risk this product
resolved a different way — by never displaying the aggregate at all, the
strongest form of "never treated as transferable."

### Consequences for the spec

- Six new read-only report screens under the existing per-project
  navigation, no new document-rendering-module kinds, no PDF/JPG.
- No home-dashboard changes beyond what Choose Project already does
  (per-project alert counts / health badges) — §39 is recorded as
  permanently out of scope, not deferred.
- Depends on nothing new schema-wise; pure read/presentation layer over
  Phase 1–3 data plus tickets 01–02's new tables where a report references
  them (none currently do — Site Diary/Photos aren't part of any §38
  report).
