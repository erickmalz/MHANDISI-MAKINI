---
status: accepted
---

# Standard co-located PostgreSQL with row-level security, on one long-running container

## Context and decision

The multi-tenant version of the app isolates every Engineer's Account by an
account key on every row of one shared database (see
`.scratch/multi-tenancy/map.md`). Resolving the "Data store: category and the
constraints it must meet" ticket, we decided the **category and hard
constraints**, not the specific product:

- **The store is one standard PostgreSQL instance** (15+), reached through a thin
  SQL-first layer (**Drizzle**, with `drizzle-kit` for migrations). Not a
  backend-as-a-service, not an embedded SQLite/PGlite file.
- **The app runs as one long-running Node/Docker container with a persistent
  volume** (Fly.io / Railway / Render or similar), not on a serverless platform.
- **The app and the database are co-located** in one region — ideally one host.
- **Tenant isolation is enforced by Postgres row-level security (RLS)** as a hard
  requirement, as the backstop beneath a single `server-only` data-access layer
  (defence in depth). The mechanism is designed in the "Tenant-scoping
  enforcement" ticket.
- **Portability is a hard rule**: the whole database moves to another provider
  with a `pg_dump`. No dependence on a vendor's proprietary auth tables,
  realtime, edge functions, or client SDK.

The specific Postgres host, backup cadence, and monitoring surface are a
fast-follow, decided with the deployment-shape work.

## Why (the trade-off)

This is the deliberate deviation from the obvious path. The obvious path for a
Next.js app is serverless (Vercel-style) plus a managed serverless database or a
BaaS such as Supabase. We rejected it for specific reasons:

- **East African users, online-required, no local-first.** No managed Postgres
  BaaS has an African (or close-enough) region; every option routes through
  Frankfurt or Mumbai at ~120–180 ms RTT. On serverless, each query is a fresh
  cross-region round trip and free-tier databases add scale-to-zero wake-up on
  top. A co-located app + DB pays that geographic cost **once per interaction**
  (user↔app), not per query, and removes cold-start and connection-pooling as
  concerns entirely.
- **The financial model needs multi-statement transactions**, and RLS needs a
  transaction-scoped `SET LOCAL`. The serverless-friendly HTTP Postgres drivers
  cannot do either; a long-lived container holding one warm pool can.
- **Solo maintainer, no security team.** This app holds third-party client PII
  and full project financials. A forgotten `where` clause is a when-not-if over
  the app's life. Database-enforced RLS is the one control that still holds when
  application code — a future contributor's, or an AI-generated route handler —
  bypasses the data-access layer.
- **Free tiers move.** During research, PlanetScale had removed its free tier,
  Turso was steering new projects off the surveyed product, and Neon Free
  force-scales-to-zero. Standard Postgres behind a thin layer means any of a
  dozen hosts can take the database on short notice, so a pricing or
  terms change is a migration, not a rewrite.

## Consequences

- **No SQLite / embedded store, ever, without reopening this ADR** — RLS does not
  exist there.
- **The Postgres host must give real role control**: the app connects as a
  non-owner, non-superuser role and tables are set `FORCE ROW LEVEL SECURITY`.
  Managed tiers that only expose a single owner/superuser role are disqualified.
- **We own uptime monitoring, runtime patching, and backups** for the container
  and the database — the cost of not being on a serverless platform.
- **Auth cannot use a store-bundled provider** (e.g. Supabase Auth); users and
  sessions live in our own Postgres. Decided in the "Auth implementation
  approach" ticket.
- **Hosting the database outside Tanzania is accepted** (disclosed in the Privacy
  Policy, PDPC cross-border transfer permit pursued — see the data-protection
  ADR/ticket). If in-country hosting is ever required, both that stance and this
  category decision reopen.
