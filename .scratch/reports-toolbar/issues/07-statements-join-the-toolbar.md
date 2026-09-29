# Do the Supplier and Subcontractor Statements get the report toolbar?

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: erickmalz (Claude session, 2026-09-29)
Blocked by: —

## Question

The Supplier and Subcontractor Statements (Operational Control decision 5)
are live, read-only views like the six Reports. Unlike them, they are scoped
to one Supplier or Subcontractor across the Account's projects, not to one
Project. Should they get the same toolbar in this effort (filters, Export
PDF/JPG/CSV, Share, Print), as decided in
[Report toolbar layout](./06-report-toolbar-layout.md)? If so, which filters
make sense for them (project, date, status)? Does a statement that spans
projects sit badly with the one-project-at-a-time rule once it can leave the
app as a file? And is a statement sent to a supplier or subcontractor a
Report Export, or something closer to an Issued Document?

## Answer

**Yes. Both Statements get the same toolbar (layout A) in this effort, and a
sent Statement is a Report Export, not an Issued Document.** Resolved by the
grilling design-tree method. Each round's firm recommendation was taken as the
decision, per the standing preference in this map's Notes.

### Round 1: in or out of this effort?

**In.** The Operational Control map (decision 5) built Statements as live
screens and deferred PDF/JPG export "until there's real demand". This request
is that demand. Sending a Statement to the supplier or subcontractor so both
sides can reconcile is the main real-world use of a statement, arguably more
than of any project report. The Statement pages (`/suppliers/[id]`,
`/subcontractors/[id]`) get the confirmed
[Report toolbar layout](./06-report-toolbar-layout.md): Filters, a yellow
Share, and More (Export PDF / JPG / CSV, Print).

### Round 2: what a sent Statement is

**A Report Export**, as defined by [What an exported report is](./01-what-an-exported-report-is.md):
live figures, "As of {date, time} EAT", on the Engineer's letterhead, never
stored or numbered, with the "not an invoice" footer and no stamp. It is
addressed to the counterparty ("Statement for {Supplier name}", plus contact
details from the register). The figures are the counterparty's own dealings
with the Engineer, so the recipient rule is unchanged.

### Round 3: the cross-project question

**No reopening of the one-project-at-a-time rule.** A Statement already lists
one party's rows across the Account's projects. That was shipped deliberately
by Operational Control decision 5 because a supplier's balance is
Account-wide. Exporting it shows the recipient only their own orders,
payments and task agreements, labelled by project, never another party's
figures and never project-level money (float, deposits, fees). The rule
guards against *comparing projects' finances*. A statement doesn't do that.

### Round 4: filters

Following [Which filters each report gets](./02-which-filters-each-report-gets.md)
(one value per dimension, totals recompute, state in the URL, dates select
rows in range with money current to today):

| Statement | Filters |
|---|---|
| Supplier | Project · PO status · Date range (order / payment date) |
| Subcontractor | Project · Task status · Date range (agreement / payment date) |

Default is **All projects**, which is what a counterparty reconciles against.
A Project filter gives a one-site statement when a supplier asks for one.
The outstanding balance follows the filters and is labelled "Outstanding
(filtered)" when any filter is on.

### Round 5: the CSV shape

Statements have two sections (orders or tasks, and payments), so the CSV is
one **ledger** instead of two tables: `Type` (Order / Payment, or
Agreement / Payment), `Date`, `Project`, `Stage`, `Reference`, `Charged`,
`Paid`, sorted by date, ending with a Total row whose `Charged − Paid` is the
outstanding balance. That is the shape a supplier's own bookkeeping expects.
The PDF/JPG keep the two on-screen sections.

### Round 6: vocabulary

`CONTEXT.md` gains **Statement** (the live, Account-wide view of everything
between the Engineer and one Supplier or Subcontractor), and **Report
Export** widens to cover a Statement as well as a Report.

### Consequences

- Operational Control decision 5's deferred "PDF/JPG export fast-follow" is
  delivered by this effort. A pointer is added there.
- Stage and Project Closeout Reports stay as they are: Issued Documents with
  PDF/JPG downloads. Share on them stays out of scope ("Share on Issued
  Documents").
- The build covers eight screens: six Reports and two Statements.

### Confirmed by the user

2026-09-29: "yes both supplier and subcontractors should also get a report
toolbar".
