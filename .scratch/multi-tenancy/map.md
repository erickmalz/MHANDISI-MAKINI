# Multi-tenancy — one account per engineer

Wayfinder decision map. Tracker: local markdown (`.scratch/multi-tenancy/`). Started 2026-09-07.

## Destination

Lock every decision needed to turn the single-user Mhandisi Makini prototype
into an **open, self-serve product where each site engineer signs up, logs in
with email + password, and works in a fully isolated Account of their own
projects** — isolation by an account key on every row of one shared database.

Reaching the end means the identity model, the tenant-scoping enforcement, the
data-store category and its constraints, the auth approach, and the path off the
mock-data prototype are all decided, so a build effort can start without
guessing. This map **produces decisions, not code**.

## Notes

- **Domain / prior spec**: `construction-supervision-app-expanded-guidelines.md`
  and `CONTEXT.md` (repo root); the completed Phase 1 decision map at
  `.scratch/phase1-decisions/`. The web prototype is in `web/` (Next.js 16, no
  backend, no auth, hardcoded `web/src/lib/mock-data.ts`).
- **Decision-maker**: the user answers every ticket personally, as the engineer
  who will use and run the product.
- **Every ticket is `grilling`** unless its `Type:` says otherwise; when working
  one, call the Skill tool for "grilling" and "domain-modeling". Research
  tickets are resolved by a subagent calling the Skill tool with "research".
- **This map plans, it does not build.** The CRUD screens and the backend
  itself are downstream efforts.

### Fixed constraints (settled while charting — not tickets)

- **Isolation**: one shared database, an account key on every row; every query
  scoped to the current Account. Not separate databases, not schema-per-account.
- **Tenant granularity**: Account is 1:1 with Engineer (an individual). No
  team/firm accounts; no sharing a Project between Engineers.
- **Signup**: open and self-serve — engineers register themselves.
- **Auth**: email + password, with password reset.
- **Connectivity**: online-required for v1; graceful "you're offline, not
  saved" messaging only. No local-first / offline sync.
- **Money**: free to use; no billing.
- **Foundations that are fixed**: the Phase 1 financial model and formulas
  (`web/src/lib/finance.ts`), the domain vocabulary in `CONTEXT.md`, and the
  one-project-at-a-time UX. This effort adds the layer beneath them.

## Decisions so far

- [What an Account owns, and what stays global](./issues/01-what-an-account-owns.md):
  The multi-tenant v1 is the **financial-control app only** — Site Diary and
  Progress Photos (and image storage) are out. **Everything the Engineer
  touches is account-scoped**; no feature ever reads across Accounts. The full
  record list is every guidelines §50 table plus two per-Account additions — a
  **Material List** (price book, starts empty) and concrete **Stage Templates**
  (start empty). Supplier and Subcontractor are per-Account registers reused
  across the Account's projects; **Client stays fields on a Project**, not an
  entity. Global: only the app + brand + design system, TZS currency, and legal
  pages. Nothing is shared or seeded.
- [Research: persistence + auth options for this Next.js 16 app](./issues/04-nextjs-persistence-and-auth-options.md):
  Next.js 16 `middleware` → `proxy` (Node-only, Edge deprecated), so a
  `server-only` Data Access Layer is the recommended enforcement point; nothing
  in the survey needs Vercel. Store shapes: managed Postgres + ORM (Drizzle best
  RLS story) = most portable; BaaS (Supabase couples Postgres RLS + Auth, Neon
  Postgres BYO-auth, Turso is DB-per-tenant SQLite that fights the shared-DB
  rule, PlanetScale no free tier); embedded SQLite/PGlite = simplest ops but one
  host, no RLS. Postgres RLS is mature but fiddly on a pooled DB. Auth: Lucia is
  deprecated; **better-auth** now the self-hosted email/password + DB-session
  default; Auth.js Credentials forces JWT; Clerk/WorkOS/Supabase are hosted.
  Every option yields a stable id for the account key.
  **No managed Postgres BaaS has an African region** — Frankfurt or Mumbai are
  the practical picks, so round-trip count matters more than region.
  Full findings: [`research/04-findings.md`](./research/04-findings.md).

- [Account lifecycle: sign up, sign in, reset, delete, first run](./issues/02-account-lifecycle.md):
  The whole end-to-end life of an Account, as product decisions (implementation
  goes to ticket 07). **Signup**: full name + email + phone + password, all
  required; phone stored-only, never for auth; password min 10 chars + common-list
  block; a required Terms/Privacy checkbox recorded with version + timestamp.
  **Verification**: soft gate — full read/write immediately, only reset and
  email-change disabled while unverified, a full-screen "verify to continue" at
  7 days, nothing ever deleted for non-verification. **Sessions**: 7-day sliding,
  no "remember me", no absolute cap; generic "email or password is incorrect";
  throttle not lockout; a Devices list with per-session and "sign out everywhere"
  revoke. **Expired session mid-task**: failed write → full-page "session ended"
  with entered values recoverable, failed read → redirect; uniform across every
  form; never a false "Saved". **Reset**: no enumeration, single-use 1h link,
  revokes other sessions and marks the email verified. **Password change**:
  current password required, revokes other sessions. **Email change**: current
  password + verify the new address before it takes effect, old address notified,
  sessions kept. **First run**: empty project picker + "Create your first
  project" + a one-line explainer, nothing seeded. **Export**: JSON of the
  Account's rows, from settings any time and as step one of deletion. **Deletion**:
  password + confirm-phrase, export offered, 30-day grace (sign-in cancels), then
  hard delete of every row on the account key and all sessions. **Email
  re-registration**: blocked during grace, free after hard delete. **Dormancy**:
  no auto-deletion, one reminder at 6 months. **Lost email**: no recovery in v1,
  said plainly. **Five transactional emails only**: verify/welcome, reset,
  email-change, deletion scheduled + completed, dormancy reminder.

- [Data-protection stance for an open product holding clients' financial data](./issues/03-data-protection-stance.md):
  The v1 posture for holding third-party client PII + financials. **Legal pages
  are launch-blocking** — Privacy Policy + Terms `v1.0`, drafted by the Engineer
  from a template, lawyer review is fast-follow. **Tanzania PDPA 2022**: comply in
  substance, **file PDPC data-controller registration before launch**, and
  **start** (not necessarily complete) the cross-border transfer permit. **The
  database may be hosted outside Tanzania** (disclosed in the policy, permit in
  progress) — a constraint handed to ticket 05, not a push toward `af-south-1`.
  **Never store**: bank details, national ID numbers, ID/document scans or any
  people-photos, dates of birth; Client phone/email optional. **Operator access**:
  admits technical reach, commits to fault/legal/abuse only, never
  analytics/marketing/training. **Breach**: notify affected Engineers + PDPC, one
  policy paragraph, no runbook for v1. **Export**: ticket 02's JSON is sufficient.
  Deletion-in-backups is left as a thread on the deployment-shape fog.

- [Data store: category and the constraints it must meet](./issues/05-data-store-category.md):
  **Category: one standard PostgreSQL instance, co-located with the app, behind a
  thin SQL-first layer** — not a BaaS, not embedded SQLite. Portability is a hard
  rule (whole DB moves with `pg_dump`, no vendor auth tables / realtime / SDK).
  **App runs as one long-running Node/Docker container with a volume, not
  serverless** — decided here because it is upstream of the store; it lets app +
  DB share a region and removes pooling, cold-start, and per-query latency.
  **Database-enforced isolation via Postgres RLS is a hard requirement** (defence
  in depth: RLS backstop + a `server-only` DAL as the primary path); this rules
  out SQLite and any single-god-role managed tier, and ticket 06 designs the
  mechanism. **Query layer: Drizzle** (`drizzle-kit` migrations). Constraint
  list: Postgres 15+, co-located, multi-statement transactions + `SET LOCAL`,
  non-owner role + `FORCE ROW LEVEL SECURITY`, repo-checked migrations, daily
  backup + tested restore, $0 at zero users / <~$25/mo at a few hundred. Hosting
  outside Tanzania stays acceptable (ticket 03 unchanged); Frankfurt or closest.
  **The specific Postgres product is a fast-follow**, decided with Deployment
  shape.

- [Mock-data cutover and the tenant-scoped data-access layer](./issues/08-mock-data-cutover.md):
  The model **inverts** — store atomic records (Deposit, Funding Request + lines,
  Fee Invoice, PO + lines/deliveries/payments, Labour Agreement + payments, Petty
  Cash, Variation) and **compute every `StageFinancials` per request** in one
  `server-only` projection function inside the RLS transaction; **no denormalised
  totals**. `finance.ts` is untouched (still takes a plain `StageFinancials`);
  `fundingRequestPending` and `Project.alerts` become derived. The `remaining*`
  figures net actuals against the stage's **Funding Request lines** (entered
  directly on the request in v1; take-off module deferred); no Funding Request →
  stage reads *unscoped*. The **DAL** is one intent-named `server-only` module at
  `web/src/lib/data/` (`getProjectOverview`, `listProjects`, `listPurchaseOrders`,
  …) with **no `accountId` in any signature** (injected by ticket 06's tx
  wrapper); it returns the existing nested `Project`/`Stage` view-model, so
  `src/components` is untouched — only the import path changes. This also settles
  the picker fog: `listProjects()` is RLS-scoped, "current project" is the route
  id, AppChrome unchanged. The three **mock files are deleted** from `src/` (real
  types + pure helpers promoted first; generators thrown away); **no seed**.
  Recommends **opaque UUIDv7 route ids** to ticket 06. Scope: table list +
  relationships + stored/computed split here; column DDL, every mutation, and the
  edit screens go to the build. Issue-action lifecycles graduated to ticket 09.
- [Auth implementation approach](./issues/07-auth-implementation-approach.md):
  **better-auth, self-hosted in the app's Postgres** — not hand-rolled (rebuilds
  too much of ticket 02's session model), not delegated (WorkOS/Clerk conflict
  with the portability rule and add a US processor). Its tables are plain, move
  with `pg_dump`, and are **prefixed `auth_`** so `account` always means the
  domain concept; **`drizzle-kit` owns all migrations**. **Sessions: opaque
  DB-backed session id** in an `HttpOnly` cookie (7-day sliding) with a **60 s
  signed cookie cache**; `proxy.ts` does an optimistic cookie check only, a
  `server-only` DAL helper does the authoritative check and is the single funnel
  ticket 06 builds on — **not a JWT**. **Account id: a minted `account_id`
  (UUIDv7)**, 1:1 with `auth_user`, created in the signup transaction, never
  changes; every domain row keys off it, nothing references `auth_user.id`.
  **Hashing: argon2id** via `@node-rs/argon2` (better-auth does it). **Email:
  Resend** free tier from a domain-authed subdomain, **Postmark** the named
  fallback — disclose the processor per ticket 03. **Abuse counters:**
  better-auth's rate limiter, DB-backed (`auth_rate_limit`), no Redis.

- [Tenant-scoping enforcement: making cross-account access impossible](./issues/06-tenant-scoping-enforcement.md):
  The RLS mechanism, the id rules, and the isolation test. **Tenant key**: a
  dedicated `accounts` table (own UUIDv7, 1:1 with `auth_user` via
  `accounts.user_id`); every domain row carries `account_id`, nothing references
  `auth_user.id`. **Coverage**: a `NOT NULL account_id` on *every* domain table,
  denormalised all the way down — RLS doesn't re-check through FKs.
  **Mechanism**: transaction-local `SET LOCAL app.current_account_id`, not
  per-tenant roles; app connects as a non-owner `app_runtime` role, migrations as
  owner; every domain table `ENABLE` + `FORCE ROW LEVEL SECURITY` with one
  identical `USING` + `WITH CHECK` policy; unset var → NULL → zero rows (**fails
  closed**). **Binding**: a `server-only` `getCurrentAccountId()` wrapped in
  React `cache()` (composed on ticket 07's session check) feeds a
  `withAccount(fn)` Drizzle transaction wrapper that issues the `SET LOCAL` as
  statement 1; the account id is **never a DAL parameter** and never comes from
  the URL/body. `proxy.ts` stays optimistic-only. **Session-less jobs**: a
  `BYPASSRLS` `maintenance` role queries `accounts` for candidates, then the
  deletion sweep loops per account setting the GUC so RLS scopes every `DELETE`.
  **Ids**: opaque non-enumerable ids in URLs (routing slugs dropped); a
  cross-account reference is **always 404**, never 403. **Honesty**: composite
  FKs `(parent_id, account_id) REFERENCES parent (id, account_id)`; `account_id`
  never writable in the DAL. **Test**: a CI suite against a real Postgres —
  two-account integration proof, raw-connection RLS test, role-capability test, a
  schema-conformance lint that fails the build when a new table lacks the full
  treatment, a composite-FK test, and a route-level 404 test.
- [The persisted lifecycle of the "issue" actions](./issues/09-issue-action-lifecycles.md):
  The three "Issue" state machines, fixed here rather than left to the build.
  **One principle**: "Issue" is the line between editable and immutable — before
  it a numberless Draft with no financial effect, at it a single atomic
  transaction that freezes content, assigns the permanent per-project number
  (`FR-{project}-001`, `PO-{project}-001` — a new Account starts at 001 on its
  first project, minted at Issue, never reused, versions share the base with a
  `v2` suffix), and starts the financial effect;
  after it only appends or a controlled supersede/cancel.
  **Funding Request**: seven states (`Draft / Issued / Superseded / Cancelled /
  Closed` stored, `Partially Deposited / Deposited` derived from Deposit
  records); Issue freezes the request and raises the Fee Invoice; a change
  **forks a version** (`v2 supersedes v1`, v1's deposits carry forward, unpaid
  Fee Invoice reissues, paid one is never touched — a fee increase raises a
  follow-up for the delta); an **Additional Funding Request is a separate new
  request, never a version**. **Purchase Order**: `CONTEXT.md`'s Commitment State
  is canonical (`Planned → Ordered → Partially Delivered → Delivered → Partially
  Paid → Paid → Closed` + `Cancelled`); "Issue" = `Planned → Ordered`;
  **"Confirmed" dropped** to an optional note; Issue freezes supplier/lines/
  prices; a real change is **cancel + reissue**, no version chain; Cancel only
  before non-voided deliveries/payments, Close is manual at fully-delivered-and-
  paid, Reopen until Stage Closeout. **Delivery/Payment records are append-only
  with reversal** (`voided_at` + `void_reason`, then re-enter — no negatives);
  **over-delivery allowed with a stored acknowledgement reason**, **over-payment
  soft-blocked with a reason**; `derivePOStatus` stays the only status source.
  **A PO's float exposure tracks the order** (`ordered − paid` while open, `paid`
  once Closed), never deliveries — over/under-delivery is a Material Variance
  reconciled at closeout. **Shareable documents**: Funding Request, Fee Invoice
  and Purchase Order each render — only once Issued, from the frozen snapshot,
  **on demand and never stored** — as PDF (authoritative) + JPG (same content,
  for WhatsApp sharing), **download-only in v1** (tokenised public links are a
  later separate decision). The build owns the DDL, `derivePOStatus`'s new body,
  the mutation endpoints and every screen. Rendering *mechanism* graduated to
  ticket 10.

## Not yet specified

- **Deployment shape** — the data store (ticket 05) fixed the *shape*: one
  long-running container + volume, standard co-located Postgres, no serverless.
  What remains is the **specific Postgres host and PaaS** (Fly.io / Railway /
  Render or similar, Frankfurt or closest), **backup cadence and tested-restore
  procedure**, and the **uptime / monitoring surface** of an open product. This
  is now operational rather than a product decision and likely belongs to a
  separate implementation-planning effort. Still carries the **data-protection
  thread** from ticket 03: when an Account is hard-deleted, how that propagates
  to database backups holding its rows — a bounded retention window vs. active
  scrubbing — which depends on the chosen backup mechanism. Ticket 10 (document
  rendering approach) also has an operational-placement thread that interacts
  with this — whether the PDF/JPG renderer is in the app container or a
  companion process.

## Out of scope

- **Site Diary and Progress Photos (§30, §31) and image / binary storage** —
  the multi-tenant v1 is the financial-control app only; site-execution records
  are a later feature (the doc's own Phase 4). Settled resolving
  [What an Account owns, and what stays global](./issues/01-what-an-account-owns.md).
- **Team / firm accounts and sharing a Project between Engineers** — ruled out
  in charting (Account is one person). A later effort if it ever matters.
- **Billing, pricing, payments** — the product launches free; adding payments
  later does not disturb the tenancy model.
- **Offline-first / local-sync** — its own architectural effort; deciding it
  here would swallow this map.
- **Bulk import of the user's three existing real projects' incurred history** —
  still deferred, as in the Phase 1 map. The user signs up like anyone else and
  enters projects through the normal flow.
- **Building the CRUD screens and the backend** — this map decides the model;
  construction is the effort that follows.
- **Reopening any Phase 1 financial decision or the one-project-at-a-time UX.**
