# Construction Supervision App

A financial-control system for a construction supervisor managing private building projects: it tracks client-supplied project funds project-by-project (never as the supervisor's own money) and layers lightweight site-execution records (diary, photos, variations) on top.

## Language

### Money positions

**Available Float**:
The client money still uncommitted for a project: deposits received, minus Open Purchase Commitments, Paid Purchases, Open Labour Commitments, Labour Payments, Petty Cash Expenses, and Other Approved Project Commitments. Always calculated per project; never nets across projects. Deposits are always 100% project funds — the supervisor's fee is never deducted from a deposit; it is billed and tracked entirely separately (see Fee Invoice). A signed Labour Agreement (Open Labour Commitments) and a Petty Cash Expense both reduce it immediately, the same way a Purchase Order does — only an Approved-but-unrealized Variation does not, until it produces an actual Purchase Order, Labour Agreement, or Petty Cash Expense.
_Avoid_: Balance, cash on hand

**Client Position**:
The project's funding side: what's been requested and deposited, set against what's committed — yielding Available Float. Distinct from the Supervisor Fee Position, which is tracked entirely separately and never nets against this.
_Avoid_: Client balance, client account

**Commitment**:
Any project cost the supervisor has become exposed to but not yet reconciled to a final paid state — a Purchase Order or a Labour Agreement, moving through its own lifecycle (see Commitment State). Counts against Available Float once it exists as an approved exposure, not only once paid.
_Avoid_: Obligation, liability (reserve "liability" for the unpaid remainder owed to one party, e.g. Outstanding Labour)

**Total Committed**:
The Supervisor Command Center dashboard's (§7) single aggregate figure: Client Deposits − Available Float. Equivalently, the sum of every line subtracted in the Available Float formula (Open Purchase Commitments, Paid Purchases, Open Labour Commitments, Labour Payments, Petty Cash Expenses, Other Approved Project Commitments).
_Avoid_: Committed (ambiguous on its own — always say "Open Purchase/Labour Commitments" for an unpaid exposure, or "Total Committed" for the dashboard aggregate)

**Open Labour Commitments**:
The unpaid remainder of a Task's signed Labour Agreement — the same figure as Outstanding Labour — netted into Available Float immediately once the agreement is signed, the same way an Open Purchase Commitment reduces float before a Purchase Order is paid.

**Material Position / Material Variance**:
A material line's estimated-vs-actual cost picture; Material Variance = Approved Estimated Material Cost − Actual Material Cost. Positive is a saving, negative is an overspend. A saving is never paid to the client as cash or kept as supervisor profit — it's credited to that project's Petty Cash.
_Avoid_: Cost variance (too generic — qualify which position it's for: material, labour, or overall)

**Subcontractor Position / Outstanding Labour**:
A subcontractor's labour picture on a task: Outstanding Labour = Revised Labour Agreement − Labour Paid − Retention Released Adjustments.
_Avoid_: Labour balance

**Supervisor Fee Position**:
The supervisor's own earnings, tracked entirely separately from project funds via a stage's Fee Invoice(s). Fee Earned is set the moment a Fee Invoice's status changes to Paid — the same event that sets Fee Received, so the two are always numerically identical; Fee Earned is kept as a distinct, labeled field for reporting even though it never diverges from Fee Received. Fee Outstanding = Fee Invoiced − Fee Received (a plain accounts-receivable figure, not Fee Earned − Fee Received, which would always be zero given how Fee Earned is defined) — it goes non-zero the moment a Fee Invoice is issued and clears once that invoice is marked Paid. Fee Recorded is the fee line on the stage's current *draft* Funding Request (base or additional) — it shows the fee as soon as it is entered, ahead of Issue raising the Fee Invoice. It never overlaps with Fee Invoiced: a request is either a draft (Fee Recorded) or issued (Fee Invoiced), never both, so the figure hands off rather than double-counting.
_Avoid_: Supervisor balance, commission (reserve "fee" as the canonical term; the doc uses "supervision fee" and "fee" interchangeably — fee is preferred)

**Forecast Funding Requirement**:
The predicted additional client funding needed: remaining material + remaining labour + remaining fee + other approved commitments, minus Available Float. Positive means "Additional Funding Required"; zero or negative means "Current Funding Adequate."
_Avoid_: Shortfall (reserve as the informal/dashboard label for a positive Forecast Funding Requirement)

**Financial Health Indicator**:
A per-stage traffic-light status derived from Available Float and Forecast Funding Requirement: Red (Float negative, or Forecast Funding Requirement positive), Green (Float ≥ Remaining Stage Requirement × 1.20 — a 20% buffer, global for Phase 1), Amber (everything between Red and Green), Blue (funding request issued, deposit pending — takes priority over the others while it applies).

**Remaining Stage Requirement**:
Remaining Material + Remaining Labour + Remaining Fee + Approved Other Commitments for a stage — the positive terms of the Forecast Funding Requirement formula, before subtracting Available Float. Used as the basis for the Financial Health Indicator's Green/Amber/Red buffer.

**Reconciliation Score**:
An informational percentage produced by the Financial Reconciliation Engine's checklist run; explicitly not an accounting certification.

### Funding & procurement flow

**Funding Request**:
A versioned, formal ask to the client for money, covering one stage's material + labour + fee breakdown. Distinct from a Deposit (the money actually received against it) and from a Purchase Order (money committed to a supplier, drawn from funds the Funding Request raised). A Draft is freely editable; **Issuing it freezes its number, lines and totals permanently**. A later correction does not edit it in place — it creates a new version that Supersedes the old one, carrying a recorded reason. Deposits already received against the superseded version still count toward the stage.
_Avoid_: Invoice (reserve "invoice" for a supplier's bill to the supervisor, the opposite money direction)

**Additional Funding Request**:
A separate, new Funding Request raised mid-stage when approved scope growth (typically from Variations) means the client owes more than the original request covered. It is **never a version of the original** — both requests stay live and the stage's funding requirement is their sum. Contrast with a superseding version, which replaces a request because it was wrong.
_Avoid_: Supplementary deposit, top-up request; and do not conflate with a superseding version

**Deposit**:
Client money actually received against a Funding Request. Always 100% project funds — never split into a fee portion, since the fee is billed and collected through its own Fee Invoice instead.
_Avoid_: Payment (reserve "payment" for money the supervisor pays out, to suppliers or subcontractors)

**Fee Invoice**:
A record of the supervisor's fee for one stage, entirely separate from that stage's Deposits, with its own Issued → Paid lifecycle (no partial-payment states). Raised the moment the stage's Funding Request is issued, independent of whether the client has deposited anything yet; still shown as a line on the client-facing Funding Request for transparency even though it isn't collected through that request's deposit flow. A follow-up Fee Invoice is issued if a later Additional Funding Request raises the stage's fee, or if a superseding Funding Request version raises it after the original Fee Invoice was already Paid (an unpaid Fee Invoice is instead reissued with the new version). A Paid Fee Invoice is never reduced or clawed back.
_Avoid_: Fee invoice line, supplier invoice (reserve "invoice" alone for a supplier's bill to the supervisor, the opposite money direction — always say "Fee Invoice" in full for this one)

**Commitment State**:
The lifecycle a Purchase Order (and, informally, a Labour Agreement) moves through so its exposure is counted exactly once: Planned → Ordered → Partially Delivered → Delivered → Partially Paid → Paid → Closed, with Cancelled as the terminal off-ramp. "Issuing" a Purchase Order is the Planned → Ordered transition; the Partially Delivered / Partially Paid states are read off the delivery and payment records rather than set by hand. A supplier's acknowledgement of an order is recorded as a note, not a distinct state.
_Avoid_: Draft (say Planned), Issued as a state name (say Ordered), Confirmed as a state

**Purchase Order**:
A formal commitment to a Supplier for material lines, tracked separately from the Delivery that fulfils it and the Supplier Payment that settles it — so "ordered," "delivered," and "paid" quantities/amounts can each differ. A Planned order is freely editable; **Ordering it freezes the supplier, lines, quantities and unit prices**. After that the order is only appended to (deliveries, payments) or Cancelled; a genuine change is a fresh replacement order, not an edit. Its exposure to Available Float is the ordered total minus payments while open, regardless of how much has been delivered — an over- or under-delivery is a Material Variance reconciled at closeout, not a change to the commitment.
_Avoid_: revising or versioning an Ordered Purchase Order (Funding Requests version; Purchase Orders are cancelled and reissued)

**Issued Document**:
The client- or supplier-facing document an Issued Funding Request, Fee Invoice or Purchase Order renders to — a PDF (authoritative) plus a JPG of the same content for inline sharing. It renders on demand and is never stored; its transactional content is the exact frozen snapshot taken at Issue, so a superseded Funding Request v1 still renders v1 forever. Only the letterhead (the Engineer's own business name, contact and logo) is drawn from the current Account profile rather than the snapshot. A Deposit, Delivery or Payment produces no Issued Document — there the Engineer is only logging the counterparty's own paperwork. The Fee Invoice carries its own per-project number, `FI-{project}-NNN`, minted when the Funding Request is issued.
_Avoid_: calling it a "generated PDF" or "export" (it is the document of record, not a convenience copy); "stored document" (it is never persisted)

**Retention**:
A percentage of a Subcontractor's labour agreement withheld until a release condition is met. Whether retention is used at all, and its release conditions, is a still-open decision.

### Project structure

**Project → Stage → Task**:
The work hierarchy. A Stage is a sequential phase of a Project (e.g. Foundation, Roofing); only one Stage is normally active at a time. A Task is a unit of work within a Stage, normally assigned to one Subcontractor.

**Variation**:
A formally logged scope change (also called a Change Order) that adjusts a Task's material/labour/fee impact without editing the original historical records — the original values are preserved alongside the revision.
_Avoid_: Change order (used interchangeably in the doc; "Variation" is preferred as the primary term since it's used for the module, numbering (`VO-`), and fields)

**Stage Closeout**:
The controlled, checklist-gated process that reconciles a Stage's work, materials, labour, client funds, fee, and documents before it can be marked complete — distinct from simply setting a Stage's status to "Completed."

**Petty Cash**:
A client-funded, per-project pool earmarked for unplanned/unforeseen site expenses. Topped up from accumulated Material Variance savings and, optionally, a dedicated upfront client contribution (which arrives as a normal Deposit, not a distinct funding path). Still counts as part of the project's Available Float — it is not a separate tracked balance, just uncommitted project money earmarked for contingencies rather than approved scope. Its balance can go negative; it never funds a Variation regardless of size.
_Avoid_: Contingency fund, slush fund

**Petty Cash Expense**:
A lightweight record for an unplanned cost paid from Petty Cash that doesn't fit any existing Purchase Order/Supplier Payment or Labour Agreement/Labour Payment. When a petty-cash-funded cost *does* fit one of those, it stays that record type and is instead marked with a `funding_source` of Petty Cash rather than Client Deposit.
_Avoid_: Miscellaneous expense

**Surplus Material**:
Material left over at Stage Closeout. In practice it's handled one of two ways: Carried Forward into the next sequential stage of the same project (added to that project's Material Stock), or Written Off as a physical loss (breakage, waste, theft) with no separate financial re-entry, since its cost was already captured at original purchase. Returning it to a supplier or transferring it sideways to a different already-open activity doesn't happen; it must never move between different client projects without an explicit accounting adjustment.
_Avoid_: Leftover material (informal synonym; "Surplus Material" is the canonical term since it's used for the closeout checklist step and the app's own terminology)

**Material Stock**:
A running, per-project, per-material-type quantity of material physically on site but not yet consumed. Incremented when Stage Closeout carries Surplus Material forward; decremented as it's drawn into a later stage's Material Take-Off or Written Off. Exists so a Material Take-Off/Funding Request can check what's already on site and request only the shortfall, rather than over-asking the client for material they've already funded.
_Avoid_: Inventory, on-site stock (both used loosely elsewhere; "Material Stock" is the canonical term for this specific tracked quantity)

### Registers and reference data

**Client**:
The person or business a Project is run for — the source of that project's funds. Held as fields on the Project (name, phone, email), **not** a separate entity: there is no client list and Projects are not grouped by Client.
_Avoid_: Customer; treating Client as a record with its own screen (it is Project data)

**Supplier**:
A business the Engineer buys materials from, kept in a per-Account **Supplier Register** and reused across that Account's projects — a Purchase Order names a Supplier from the register. Carries contact details, payment terms and, through its purchase history, an effective statement.
_Avoid_: Vendor, merchant

**Subcontractor**:
A trade crew or individual the Engineer engages for a Task's labour, kept in a per-Account **Subcontractor Register** and reused across projects. Carries trade, contact details and labour history. One Subcontractor per Task (Phase 1 decision 05).
_Avoid_: Contractor (the Engineer is not "the contractor" here), labourer, worker

**Material List**:
A per-Account reusable list of material items and the Engineer's usual unit prices, used to cut re-entry into Material Take-Offs and Purchase Orders. Starts empty for a new Account and is built up as the Engineer works. It is a convenience layer, not part of the financial model — the authoritative costs are always the ones on the actual take-off and PO lines.
_Avoid_: Catalogue, price book (informal synonyms; "Material List" is canonical), and any sense that it is shared between Accounts

**Stage Template**:
A per-Account reusable set of Stages and their Tasks, applied to spin up a new Project quickly. Starts empty; the Engineer saves their own. Not shipped with the app.
_Avoid_: Boilerplate, preset

### Identity and tenancy

_The app was single-user through Phase 1. The move to many independent engineers is decided (`.scratch/multi-tenancy/map.md`, ADRs 0001–0004) and being built in phases. Phase 1 — persistence, better-auth email/password, and the `accounts` tenant key with Postgres row-level security — is in `web/`; the domain schema, the data-access-layer cutover from the mock files, the issue-action state machines, and the account-lifecycle flows follow. The terms settled by the map are recorded here._

**Engineer**:
A person who uses the app — a working site engineer. The app is operated directly by the Engineer; clients and subcontractors never log in. Each Engineer signs themselves up.
_Avoid_: User (say Engineer for the person and Account for their data), operator, supervisor (a role word from the Phase 1 spec — the person is still an Engineer even where the spec says "supervisor")

**Account**:
One Engineer's isolated world of data — every Project of theirs and everything beneath it (Stages, Tasks, Purchase Orders, Funding Requests, Deposits, Fee Invoices, Alerts). An Account belongs to exactly one Engineer (1:1). Engineers never share an Account or a Project, and one Engineer's data is never visible to another.
_Avoid_: Tenant (an implementation term — the mechanism is a shared database with an account key on every row), Organisation, Team, Workspace (an Account is one person, not a group)

**Platform Admin**:
The person who runs the MHANDISI MAKINI service itself — support and operations on the whole system, not on any one Engineer's work (`.scratch/platform-admin/map.md`). A Platform Admin does not own an Account and never appears inside Account-scoped data (Projects, Stages, Tasks, etc.). Distinct from Engineer even though both sign in through the same form.
_Avoid_: Admin (bare — reads as an Account-level role, and none exists), Operator (already reserved as an avoid-term for Engineer, above), Superadmin/Root (implementation jargon, not how the product talks about the role)
