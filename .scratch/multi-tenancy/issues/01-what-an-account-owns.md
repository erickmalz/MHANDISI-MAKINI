# What an Account owns, and what stays global

Type: grilling
Status: open
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
