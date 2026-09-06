# Data-protection stance for an open product holding clients' financial data

Type: grilling
Status: open
Blocked by: —

## Question

Each Account holds not just the Engineer's own details but **their clients'
names, sites, deposits, and full project financials** — third-party personal and
commercial data. An open, self-serve product needs a deliberate stance before
launch. Decide the minimum:

- **Legal pages**: does v1 launch need a privacy policy and terms of use, or is
  that a fast-follow? Who drafts them?
- **What PII is stored and where**: engineer email/name; client names, sites,
  possibly contact details inside project records. Any data that should *not* be
  stored (e.g. no client bank details)?
- **Data export**: can an Engineer export their Account's data (for their own
  records, or to leave)? Format — does the app already produce documents
  (funding requests, purchase orders) that would serve, or is a full export
  needed?
- **Deletion**: confirmed against ticket 02 — deletion is real and complete.
- **Breach / access**: stance on who (if anyone) at the product side can read
  Account data, and under what circumstances (support, debugging).
- **Jurisdiction**: Tanzania-based engineers and clients — is there a local data
  protection regime to name, or is a general "reasonable custodian" standard
  enough for v1?

Already settled by the account-lifecycle ticket (02), so not open here:

- **Deletion** is real and complete — 30-day grace, then a hard delete of every
  row on the account key. Confirmed.
- **Data export** exists — a JSON file of the Account's rows, from settings any
  time and as step one of deletion. This ticket may still say whether that JSON
  shape is enough or a document pack is needed, but the mechanism is fixed.
- A **Terms/Privacy acceptance checkbox** is captured at signup with the policy
  version and timestamp. This ticket still owns the *content* of those pages and
  who drafts them.

Resolve by fixing the launch-blocking minimum and listing what is a fast-follow.
