# Data-protection stance for an open product holding clients' financial data

Type: grilling
Status: resolved
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

## Answer

The v1 data-protection stance. Every item is a **product / policy decision**;
drafting the actual policy text and building any request-handling machinery is
downstream.

### Legal pages — launch-blocking

- A **Privacy Policy** and **Terms of Service** must both exist at launch; the
  signup acceptance checkbox fixed in ticket 02 already depends on them.
- The Engineer (product owner) **drafts `v1.0` themselves** from a reputable SaaS
  template, adapted to name exactly what this app stores and why, and to
  Tanzanian law. A Tanzanian lawyer's review is a **fast-follow**, not a launch
  blocker.
- The policy version string is recorded with the acceptance timestamp on the
  Account (mechanism already set in ticket 02).

### Jurisdiction — Tanzania PDPA 2022: comply in substance, register, disclose the gap

Tanzania's **Personal Data Protection Act, 2022** is in force, administered by
the **Personal Data Protection Commission (PDPC)**. It requires every data
controller/processor to **register** with the PDPC, and cross-border transfers of
personal data to need a **PDPC permit** (Form No. 7) plus an adequacy assessment
of the destination country.

Chosen posture (option **b** of three):

- Write the Privacy Policy to the **shape of the PDPA** — stated lawful basis,
  retention, data-subject rights, breach notification.
- Complete **PDPC data-controller registration** as a pre-launch checklist item.
  It is cheap and not optional for a Tanzanian business processing third-party
  personal + financial data.
- The data store **may sit outside Tanzania** (the research ticket found no
  managed Postgres with an African region; Frankfurt or Mumbai are the practical
  picks). This is **disclosed plainly** in the Privacy Policy.
- **Start** the cross-border transfer permit process, but treat the permit itself
  as a **documented known compliance gap**, not a launch blocker, and not a
  reason to force self-managed Postgres in `af-south-1`.
- Rejected: full pre-launch compliance including the permit (option a — would let
  the permit hold the product hostage and could dictate the database region);
  "reasonable custodian" with no registration at all (option c — not defensible
  for a real TZ business holding this data).

**Constraint handed to ticket 05 (data store):** hosting the database outside
Tanzania is acceptable, provided it is disclosed and the PDPC cross-border permit
is pursued. If a future decision instead requires in-country hosting, that
reopens this posture and changes ticket 05's options.

### PII stored, and the hard "never store" list

- **Stored:** Engineer — full name, email, phone. Client — name (**required**),
  phone and email (**optional**), as fields on a Project. Supplier and
  Subcontractor — name plus business contact details, in their per-Account
  registers. Project financials (deposits, purchase orders, payments, fee
  invoices) name amounts and parties only.
- **Never stored:** bank-account details of anyone (client, subcontractor,
  supplier), national ID numbers, passport / ID-document scans or any document
  images, dates of birth, photographs of people. Enforced in the schema, stated
  in the Privacy Policy.
- Consistent with ticket 01 already ruling image / binary storage out of scope.

### Product-side access to Account data

- The stance acknowledges that the **sole operator can technically reach any
  Account** (they run the database) — claiming zero access would be untrue.
- Committed in the Privacy Policy: identifiable Account data is read **only** to
  investigate a fault the Engineer has reported, to comply with a lawful demand,
  or to stop abuse — **never** for analytics, marketing, or model training.
- No formal audit-logging infrastructure required for v1; the policy states the
  principle.

### Breach response

- One Privacy-Policy paragraph: on discovering a breach affecting an Account's
  data, notify the affected Engineer(s) by email without undue delay, and notify
  the PDPC as the Act requires.
- No separate written incident-response runbook for v1.

### Data export format — JSON is sufficient

- The "single JSON file of the Account's rows" mechanism fixed in ticket 02 is
  **enough** for the v1 portability obligation.
- A human-readable pack (bundling the funding requests / purchase orders the app
  already renders) is a **post-launch nicety**, not launch-blocking.

### Deletion — confirmed, with one open thread

- Deletion is real and complete per ticket 02 (30-day grace, then hard delete of
  every row on the account key and all sessions).
- **Still open, deferred to deployment shape:** how a hard delete propagates to
  **database backups** that still contain the deleted rows (a retention window vs.
  active scrubbing). Noted on the map's "Not yet specified — deployment shape"
  patch rather than ticketed now, because it depends on the backup mechanism,
  which depends on the data store (ticket 05) and deployment.

### Launch checklist produced by this decision

1. Privacy Policy `v1.0` + Terms of Service drafted and published.
2. PDPC data-controller registration filed.
3. PDPC cross-border transfer permit application started.
4. Schema enforces the never-store list.
5. Privacy Policy covers: what is stored, lawful basis, retention/deletion,
   data-subject rights, operator-access limits, breach notification, and
   out-of-country hosting.

### Fast-follow (not launch-blocking)

- Lawyer review of the legal pages.
- Cross-border transfer permit **granted** (application must be started).
- Human-readable export pack.
- Formal incident-response runbook and access audit logging.
