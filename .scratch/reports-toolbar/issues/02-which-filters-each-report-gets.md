# Which filters each report gets

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: erickmalz (Claude session, 2026-09-29)
Blocked by: —

## Question

None of the six reports can be filtered today. For each one, which filter
dimensions are worth having, given what its rows carry (see
`web/src/lib/data/reports.ts`)?

- Financial Summary and Material Cost: rows are per stage.
- Procurement: per Purchase Order — stage, supplier, PO status.
- Labour: per Task — stage, subcontractor, task status.
- Funding: per Funding Request — stage, kind, status.
- Variations: per Variation — stage, approval status, funding status,
  requested date.

Also decide:

- Do the totals row and the headline figures recompute over the filtered rows,
  or stay whole-project with the filter applied only to the list?
- Do filters live in the URL (the `?stage=` idiom Activity History already
  uses), so a filtered view can be bookmarked and survives a refresh?
- Is there a date range at all? If yes, which date each report filters on.
  The harder "position as of a past date" reading is fog on the map; flag it
  if the answer needs it.

## Answer

Every report gets a **Stage** filter. Reports whose rows carry more than a
stage get the dimensions those rows already have. Nothing new is calculated.
Resolved by the grilling design-tree method. Each round's firm recommendation
was taken as the decision, per the standing preference in this map's Notes.

### Round 1: filter dimensions per report

| Report | Filters |
|---|---|
| Financial Summary | Stage |
| Material Cost | Stage |
| Procurement | Stage · Supplier · PO status · Issued date range |
| Labour | Stage · Subcontractor · Task status |
| Funding | Stage · Kind (base / additional) · Status · Issued date range |
| Variations | Stage · Approval status · Funding status · Requested date range |

- **One value per dimension** ("All" or one choice), not multi-select. It keeps
  the controls usable on a phone. Filters in different dimensions combine
  (AND).
- **Choices are only values that occur in this project.** The Supplier list
  shows suppliers on this project's POs, not the whole register. Stage lists
  stages in `seq` order.
- Financial Summary and Material Cost rows *are* stages, so Stage is their only
  meaningful filter.

### Round 2: what the totals do

**Everything on screen recomputes over the filtered rows.** The totals row is
always the sum of the rows shown, because a total that doesn't match its rows
invites mistakes, and a filtered export (ticket 04) must add up.

- A headline figure that is a sum of rows follows every filter.
- A headline figure that exists only per stage follows the **Stage** filter
  only. Examples are Procurement's "Required" (the material estimate) and
  Financial Summary's float and shortfall. When a finer filter is active
  (Supplier, status, date), such a figure is **hidden**, because no
  per-supplier "required" exists.
- Financial Summary keeps its existing rule: a surplus stage never offsets a
  shortfall stage. Filtered to one stage, it simply shows that stage.
- While any filter is active, the screen shows a **"Filtered: …" line**
  naming each active filter, plus a one-tap **Clear filters**, and the totals row reads
  "Total (filtered)".

### Round 3: where filter state lives

**In the URL, as search params:** `?stage=`, `?supplier=`,
`?subcontractor=`, `?status=`, `?kind=`, `?funding=`, `?from=`, `?to=`
(ISO dates). This follows the `?stage=` idiom Activity History already uses.
A filtered view survives a refresh, can be bookmarked, and gives export
(ticket 04) and share (ticket 05) one unambiguous description of what's on
screen. Ids are opaque UUIDs as elsewhere. An unknown or foreign value is
ignored (treated as "All"), never an error. It stays server-rendered, with no
client-side filter state.

### Round 4: date ranges

**A date range selects rows whose own date falls in the range.** That is the
PO's issue date, the Funding Request's issue date, or the Variation's requested
date. The money columns on those rows (delivered, paid, deposited,
outstanding) stay **current to today**, and the "Filtered" line says so:
"Issued 1–30 Sep · figures as of today". This answers the common question,
"what did I order or request this month and where does it stand now?"

Labour, Material Cost and Financial Summary get **no date range.** Their rows
(tasks, stages) have no single date of their own.

**"The position as it stood on a past date" is not built.** It would need
figures recomputed from history, which the live read model cannot do, and
Report Exports already give a dated record of the position when one is
needed ("As of", from [What an exported report is](./01-what-an-exported-report-is.md)).
It is ruled out of scope on the map.

### Round 5: vocabulary

No new domain terms. Filters are a view concern over existing terms, so
`CONTEXT.md` is unchanged.

### Consequences

- [Export formats and whether filters carry into them](./04-export-formats-and-filters.md):
  the URL's search params are the complete filter state an export must
  reproduce, and the "Filtered: …" line is ready-made text for the exported
  page.
- [Report toolbar layout](./06-report-toolbar-layout.md): Procurement and Funding
  carry four dimensions. Activity's row of chips won't scale to that, which
  is exactly what the prototype must solve.
