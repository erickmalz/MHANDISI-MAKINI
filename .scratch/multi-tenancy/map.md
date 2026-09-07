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

## Not yet specified

- **The project picker and "current project" under tenancy** — the picker shows
  only the Engineer's own projects; where "current project" lives (client route
  vs. server session); whether the AppChrome "Switch project" flow changes. The
  brand-new-Account empty state is now settled (see the account-lifecycle
  decision: empty picker + "Create your first project" + a one-line explainer,
  nothing seeded); the rest still waits on the data-access layer (ticket 08).
- **The existing mock "issue" actions becoming real** — the funding-request
  wizard's "Issue to client", the purchase-order builder's "Issue", "Record
  delivery / payment", the "Marked as issued" states. Decide whether this map
  specifies their persisted lifecycle or hands it to the build, once the
  data-access model (ticket 08) is set.
- **Deployment shape** — the data store (ticket 05) fixed the *shape*: one
  long-running container + volume, standard co-located Postgres, no serverless.
  What remains is the **specific Postgres host and PaaS** (Fly.io / Railway /
  Render or similar, Frankfurt or closest), **backup cadence and tested-restore
  procedure**, and the **uptime / monitoring surface** of an open product. This
  is now operational rather than a product decision and likely belongs to a
  separate implementation-planning effort. Still carries the **data-protection
  thread** from ticket 03: when an Account is hard-deleted, how that propagates
  to database backups holding its rows — a bounded retention window vs. active
  scrubbing — which depends on the chosen backup mechanism.

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
