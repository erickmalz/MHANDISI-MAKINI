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

## Not yet specified

- **The project picker and "current project" under tenancy** — the picker shows
  only the Engineer's own projects; where "current project" lives (client route
  vs. server session); the empty picker on a brand-new Account; whether the
  AppChrome "Switch project" flow changes. Revisit once account lifecycle
  (ticket 02) and the data-access layer (ticket 08) are settled.
- **The existing mock "issue" actions becoming real** — the funding-request
  wizard's "Issue to client", the purchase-order builder's "Issue", "Record
  delivery / payment", the "Marked as issued" states. Decide whether this map
  specifies their persisted lifecycle or hands it to the build, once the
  data-access model (ticket 08) is set.
- **Deployment shape** — where the app and the database run, and the operational
  surface of an open product (backups, uptime). Revisit after the data store
  (ticket 05) is chosen; may prove to belong to a separate
  implementation-planning effort.

## Out of scope

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
