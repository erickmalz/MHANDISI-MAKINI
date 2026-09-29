# What an exported report is

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: erickmalz (Claude session, 2026-09-29)
Blocked by: —

## Question

Phase 4 ticket 06 ruled the six report screens out of PDF/JPG export because
they are live, always-current views and not Issued Documents (frozen
`document_snapshot`, a number, a lifecycle stamp). The user now wants them
exportable, shareable and printable. What is an exported or printed report in
the domain?

- An "as of {date, time}" rendering of the live figures at the moment of
  export, never stored and never numbered, clearly not an Issued Document?
- Or a stored, numbered snapshot someone can come back to later?

This settles what the document must say about itself (an "as of" line, who
generated it, and whether it may be sent to a client or is internal only). It
also settles whether the "issued documents need PDF and JPG" rule applies, and
whether `CONTEXT.md` gains a term (e.g. "Report Export") distinct from
"Issued Document". It supersedes the export half of Phase 4 ticket 06, which
needs a pointer back here once resolved.

## Answer

**A Report Export is a dated rendering of a Report's live figures at the
moment it is made. It is not an Issued Document.** It is rendered on demand
and never stored, numbered or versioned. Exporting again later gives the
figures as they stand then. This reverses only the export half of Phase 4
ticket [Advanced Reporting Dashboard](../../phase4/issues/06-advanced-reporting-dashboard.md).
That ticket's reasoning (reports are live views, not frozen records) still
holds. What changes is that a live view may now leave the app as a dated copy.

Resolved by the grilling design-tree method. Each round's firm recommendation
was taken as the decision, per the standing preference in this map's Notes.

### Round 1: stored or on demand?

**On demand, never stored.** A stored copy would need a number, a list and a
lifecycle, and it would go stale the moment the next payment is logged. The
engineer's need ("send the client where the money stands") is met by a
fresh rendering each time. This follows the Issued Document precedent: it is
never stored as a file either (ADR 0005). The difference is the source: an
Issued Document renders a frozen snapshot, a Report Export renders current
figures.

### Round 2: what it says about itself

Every Report Export carries:

- **The Engineer's letterhead** from the current Account profile, the same
  shell as Issued Documents, so it looks professional when a client sees it.
- **The report name, project name and project code.**
- **An "As of" line with date and time** (East Africa Time), e.g. "As of
  29 Sep 2026, 14:05". This is the one thing that stops a stale copy
  passing for current.
- **The active filters**, when any are applied (how filters carry into
  exports is decided in ticket 04).
- **A footer line:** "Live figures at the time shown. Not an invoice or
  request for payment." This keeps it from being read as an Issued
  Document.

It carries **no number, no status stamp** (PAID / VOID / SUPERSEDED), no
signature block. Financial Summary's existing "reviewed by" line on its print
sheet is a working-paper feature and ticket 04 decides whether it stays.

### Round 3: who may receive it

**Anyone the Engineer chooses: client, site partner or themselves.** There is
no internal-only / client-safe split and no redacted variant. Every figure on
these reports is either the client's own money, which they are entitled to
see, or the supervision fee, which the Funding Request already shows the
client for transparency. The Engineer decides what to send. A redacted
"client version" is ruled out of scope for this effort (see the map).

### Round 4: does the "issued documents need PDF and JPG" rule apply?

**Not as a rule.** That rule binds records the Engineer *issues* outward
(Funding Request, Fee Invoice, Purchase Order, closeout reports). A Report
Export is not issued. Its formats are decided on their own merits in ticket
04, where the WhatsApp reason behind PDF+JPG (a JPG previews inline) still
carries weight.

### Round 5: vocabulary

`CONTEXT.md` gains **Report** (a live, read-only per-project analytical view)
and **Report Export** (the dated rendering above). Avoid "snapshot",
"issued report" and "statement" for them. "Snapshot" means the frozen
Issue-time content, and "statement" belongs to the Supplier/Subcontractor
Statements.

### Consequences

- Ticket 04 can treat the PDF path as a new render kind of the existing
  document module that takes live figures plus an "as of" time, not a
  `document_snapshot`.
- Ticket 05: because an export may go to a client, "share" must work for
  sending to someone else, not only to the Engineer's own devices.
- Phase 4 ticket 06 gets a pointer back here.
- The Stage and Project Closeout Reports are unaffected. They are Issued
  Documents with frozen snapshots.
