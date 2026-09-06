# Research: persistence + auth options for this Next.js 16 app

Type: research
Status: resolved
Blocked by: —

## Question

Surface the current, idiomatic ways to add a **persistent relational data store**
and **email/password auth** to the app in `web/` — Next.js 16 with Turbopack
(note `web/AGENTS.md`: this Next.js has breaking changes; read
`web/node_modules/next/dist/docs/` before relying on training-data assumptions).

Report on, at minimum:

- **Data-store shapes**: a managed Postgres + an ORM/query builder (Drizzle,
  Prisma, Kysely) hosted separately; a backend-as-a-service (Supabase, Neon,
  Turso/libSQL, PlanetScale); an embedded store. For each: does it support
  **row-level tenant enforcement** (e.g. Postgres RLS), and how mature is that
  path.
- **Auth options**: rolling email/password by hand vs. a library (Auth.js /
  NextAuth, Lucia, better-auth, Clerk, Supabase Auth, WorkOS). For each: does it
  hand you a stable **user id you can put in an account key**, session model
  (cookie vs JWT), and how it interacts with Next.js 16 server components /
  route handlers / middleware.
- **Where the app runs**: which stores/auth assume Vercel, which are portable,
  cold-start and connection-pooling implications for serverless.
- **Tanzania relevance**: latency / region availability of the managed options
  for East African users.

Capture findings at `.scratch/multi-tenancy/research/04-findings.md` and link it
from this ticket. This is input to tickets 05, 06 and 07 — surface options and
trade-offs, do not pick.

## Answer

Full findings: [`../research/04-findings.md`](../research/04-findings.md).

Gist:

- **Next.js 16 facts that constrain the choices** (from the bundled
  `web/node_modules/next/dist/docs/`): `middleware` is now `proxy` and is
  **Node.js-runtime only** — the Edge runtime is deprecated framework-wide, so the
  old "edge-compatible auth" concern is gone. `cookies()`/`headers()` are async.
  Next's own guidance: a `server-only` **Data Access Layer** is the recommended
  enforcement point; proxy checks stay optimistic; Server Actions / Route Handlers
  are separate entry points that must each re-verify. The app is deployable as a
  plain Node server, Docker, or via adapters (Vercel + Bun verified) — **nothing
  here requires Vercel**. `pg`, `@prisma/client`, `better-sqlite3`, `libsql`,
  `bcrypt`, `@node-rs/argon2` are all in the auto-external allow-list.
- **Data-store shapes**: (a) managed Postgres + ORM — Drizzle (first-class RLS
  primitives), Prisma (RLS via a client extension + interactive transaction),
  Kysely (you build the funnel); most portable. (b) BaaS — Supabase (real
  Postgres, RLS + Auth deeply wired via `auth.uid()`), Neon (Postgres, bring your
  own auth), Turso/libSQL (SQLite; multi-tenancy idiom is DB-per-tenant, which
  fights the fixed "one shared DB" rule; single-writer; needs persistent disk),
  PlanetScale (no free tier). (c) embedded (`better-sqlite3`/PGlite) — simplest
  ops, zero DB latency, but only on a single long-lived host with a disk (not
  serverless), no RLS, single-writer ceiling.
- **Row-level enforcement**: Postgres RLS is mature (core since 9.5 / 2016) but for
  a shared pooled DB needs a non-owner app role + `FORCE ROW LEVEL SECURITY` +
  transaction-scoped `SET LOCAL` + care around FK/`TRUNCATE` leaks. A single DAL
  funnel is Next's recommended, store-agnostic pattern (and the only option if the
  store is SQLite). Defence-in-depth = both, at a keep-in-sync cost.
- **Auth**: hand-rolled (max control/work; Next docs show the exact flow with
  Jose/iron-session), Auth.js (email+password = the Credentials provider, which
  **forces JWT sessions — no DB-session adapter** — and you still build
  reset/verify/rate-limit), **better-auth** (email/password + reset + verification
  + DB-backed sessions first-class, self-hosted in your DB; the de-facto successor
  now that **Lucia is deprecated / now just a copy-paste reference**), Clerk
  (hosted identity, 50k MRU free, `user_...` id, vendor-homed credentials), WorkOS
  AuthKit (hosted, 1M MAU free), Supabase Auth (only if the store is Supabase;
  stable `auth.users` UUID, RLS integration). **Every option yields a stable id
  usable as the account key**; consider minting your own `account_id` (1:1 with
  the auth identity) so the row key never depends on a vendor's id format.
- **East Africa**: **no managed Postgres BaaS (Neon, Supabase, PlanetScale, Turso)
  has an African region.** AWS `af-south-1` (Cape Town) is the only in-continent
  AWS region and requires self-managed Postgres. East-African traffic often routes
  via Europe; practical lowest-latency managed picks are Frankfurt (`eu-central-1`)
  or Mumbai (`ap-south-1`), ~120–180 ms RTT. This makes round-trip count (DAL /
  server components, app+DB co-located, no N+1) matter more than the exact region,
  and serverless cold-start / Neon-Free scale-to-zero stacks latency on top.
