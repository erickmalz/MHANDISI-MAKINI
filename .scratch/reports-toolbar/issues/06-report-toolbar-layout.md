# Report toolbar layout

Type: prototype
Label: wayfinder:prototype
Status: resolved
Assignee: erickmalz (Claude subagent, 2026-09-29)
Blocked by: 02, 04

## Question

How do filters plus Export / Share / Print sit on a report screen at phone
width and on desktop, without crowding the table? One toolbar or a filter
sheet? Chips showing active filters? Which action, if any, is the primary
button? Build a rough throwaway prototype on one report (Procurement has the
most filter dimensions) to react to, using the Mhandisi Makini design system.

## Answer

**Variant A: one toolbar row, "Filters (n)" opening a sheet, a yellow Share
button, and a "More" menu for Export PDF / JPG / CSV and Print. Active
filters show as removable chips under the toolbar.** Chosen by taking the
prototype's recommendation, per the standing preference in the map's Notes.
The user can still overturn it after looking at the screenshots.

**Prototype (throwaway):** branch `prototype/report-toolbar-2026-09`, commit
`82bf494`,
`web/src/app/(app)/projects/[id]/reports/procurement/_prototype-toolbar/toolbar-variants.html`.
It is static HTML with mock data (the live route needs auth and a seeded
project). Open it and switch with `?variant=a|b|c`; `?state=` forces a sheet
or menu open. Screenshots are in `.scratch/reports-toolbar/prototype/` at
375px, 1280px and Pixel 10 (412×915 @2.625). There is also a one-tap
side-by-side image, `pixel10-all-variants.png`.

### The chosen layout (A)

- **Toolbar row:** `Filters (3)` on the left, then `Share` (the one yellow
  primary) and `More ▾` on the right. It is the same on phone and desktop.
- **Filters:** a bottom sheet on phones and a right-anchored panel on
  desktop. It holds one field per dimension, with **Clear all** and a
  primary **Show N orders** button that applies them. No filtering happens
  on every change, because each filter is a server-rendered URL change.
- **Active filters:** removable chips under the toolbar (tap ✕ to drop one),
  then the "Filtered: … · figures as of today · Clear filters" line from
  [Which filters each report gets](./02-which-filters-each-report-gets.md).
- **More menu:** Export PDF ("Best for long reports and printing"), Export
  JPG ("Previews in WhatsApp chats"), Export CSV ("Opens in Excel or Google
  Sheets"), a divider, then Print ("Opens the PDF to print"). This is from
  [Export formats and whether filters carry into them](./04-export-formats-and-filters.md).
- **Totals** read "Total (filtered)". Headline figures that exist only per
  stage (e.g. "Required") are hidden when a finer filter is on, with a
  one-line note saying why.

### Primary button

**Share is the one yellow primary.** Sending a report to the client is the
main outward action (from [What an exported report is](./01-what-an-exported-report-is.md)),
and the other actions are occasional. Inside the filter sheet, "Show N
orders" is that sheet's own primary. If the share ticket ends up making
Share a menu of choices, the button stays primary and opens that menu.

### Why not B or C

- **B (inline select grid + three plain buttons):** on a Pixel 10 the four
  filter fields take over half the first screen before any figure appears,
  and on every visit, even though filters change rarely. It also has no
  obvious primary action.
- **C (scrolling filter chips + sticky bottom action bar):** the Status and
  Issued chips scroll off-screen at phone width, so active filters can be
  hidden. The sticky bar permanently costs about 70px and competes with the
  app's own bottom navigation. Its best idea is chips that show the current
  value, and A keeps that as the removable chips.

### Phone vs desktop

It is the same structure on both. Only the filter surface changes (bottom
sheet vs anchored panel). On phones the table keeps its existing reduced
columns (Order, Status, Outstanding). Desktop shows every column.

### Carries to the other five reports

The same toolbar sits on every report. A report with only the Stage filter
(Financial Summary, Material Cost) still uses `Filters (n)` rather than an
inline control, so every report behaves the same.

### Confirmed by the user

2026-09-29: after reviewing the Pixel 10 screenshots of all three variants,
the user confirmed **variant A** as-is: "go with prototype variation A".
