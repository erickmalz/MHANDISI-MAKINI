# What an Account owns, and what stays global

Type: grilling
Status: resolved
Blocked by: —

## Question

Everything an Engineer creates lives inside their Account and carries its
account key. Confirm the full list of account-scoped record types, and decide
what — if anything — is **global** (shared across all Accounts) rather than
copied per Account.

Specifically:

- **Account-scoped** (assumed): Project, Stage, Task, Purchase Order, Delivery,
  Supplier Payment, Funding Request, Deposit, Fee Invoice, Labour Agreement,
  Labour Payment, Petty Cash Expense, Variation, Material Stock, Alert, and the
  site-execution records (diary, photos). Anything missing? Anything that should
  *not* be account-scoped?
- **Reference data**: supplier names, subcontractor names, a material catalogue
  with default unit costs (`web/src/lib/procurement-mock.ts` currently hardcodes
  Tanzanian suppliers and prices). Per-Account (each Engineer builds their own
  list), or a shared starter set every Account can draw from and extend?
- **Genuinely global**: currency (TZS only), the app's own configuration, the
  brand. Confirm nothing else the Engineer touches is shared.
- **Cross-Account leakage risks**: is there any report, export, aggregate, or
  admin view that would ever read across Accounts? (Charting assumes no.)

Resolve by naming every account-scoped record type and the handful of global
things, and by deciding the reference-data question (per-Account vs shared
starter set).

## Answer

**Scope of the multi-tenant v1**: the financial-control app as it stands.
Site Diary (§30) and Progress Photos / Attachments (§31, §32) — and therefore
binary/image storage — are **not** in this effort; they are a later feature
(matches the doc's own Phase 4). When they are added they will be
account-scoped like everything else.

**Everything an Engineer touches is account-scoped.** Every record type below
carries the account key; nothing is exempt; no feature ever reads across
Accounts (no benchmarking, aggregates, or admin product view — support access
is ticket 03's concern).

Account-scoped record types (from guidelines §50, plus the two additions):

- Project (Client is **fields on the Project** — `client_name/phone/email` —
  not a separate entity)
- Stage, Task
- **Subcontractor** and **Supplier** — per-Account registers (§25, §26),
  reused across the Account's projects, carrying contact details, rates and
  history
- Material take-off lines (`material_lines`, under Task)
- **Material List** — *new*: a per-Account reusable list of material items and
  the Engineer's usual unit prices, to cut re-entry into take-offs and POs.
  Starts empty for a new Account; the Engineer builds it as they go (or an item
  is offered to be saved when first typed). Not part of the financial model.
- Funding Request (+ its lines, + versions via `supersedes_request_id`)
- Deposit
- Purchase Order (+ lines), Delivery (+ lines), Supplier Payment
- Labour agreement terms (on Task: `labour_original/revised`,
  `retention_percent`) + Labour Payment
- Fee Invoice
- Petty Cash Expense (and the per-project Petty Cash pool it draws on — an
  earmark within Available Float, not a stored balance)
- Variation / Change Order
- Material Stock (per-project, per-material-type on-site quantity)
- Stage Closeout, Project Closeout
- Project Alert
- Audit-trail events (`audit_events`, §40) — per-Account via their project
- Generated Reports (§38) — on-demand, account-scoped
- **Stage Template** — *new / §15 made concrete*: a per-Account reusable set of
  stages + tasks to spin up a project. Starts empty; the Engineer saves their
  own. (Shipping one or two starter templates was offered and declined —
  nothing is shared.)

Derived views (§51: `project_financial_position`, health indicator, Available
Float, Total Committed, Reconciliation Score, …) are **computed, not owned** —
they are functions over the account-scoped records.

Global (not per-Account): the application itself, the MHANDISI MAKINI brand and
design system; currency = TZS only; legal / policy pages. Nothing else the
Engineer touches is shared — including the material list and stage templates,
which are per-Account and start empty.
