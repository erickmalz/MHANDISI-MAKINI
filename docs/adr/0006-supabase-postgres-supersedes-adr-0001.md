---
status: accepted
---

# Supabase-hosted Postgres supersedes ADR 0001's "no BaaS" clause

## Context and decision

ADR 0001 fixed the data store as **one standard, self-hosted Postgres
instance**, co-located with the app container, and explicitly rejected a
BaaS such as Supabase — on East-Africa latency (no nearby region, so a
serverless/BaaS DB reintroduces a cross-region round trip per query), on
`SET LOCAL`-based RLS needing a persistent session (serverless-friendly HTTP
drivers can't do that), and on owning uptime/patching/backups as the cost of
avoiding those two problems.

The product has since reached the end of its build roadmap (Phase 1–4, all
merged and CI-verified) and the priority has shifted from "avoid ops
overhead at the cost of self-hosting everything" to "get to a real,
reachable environment without carrying backups/monitoring/patching as a
solo maintainer." **Decision: the database moves to a Supabase project's
standard Postgres instance**, reached with a **session-mode connection** —
either Supabase's plain direct connection (IPv6; port 5432 on
`db.<project-ref>.supabase.co`) or its **Session pooler** (IPv4-reachable;
port 5432 on `aws-0-<region>.pooler.supabase.com`, username
`<role>.<project-ref>`) — but never its **Transaction pooler** (port 6543),
which recycles the underlying connection between statements and breaks `SET
LOCAL` session state, and therefore the RLS mechanism this app depends on.
In practice the Session pooler is the default choice: Supabase's plain
direct connection is IPv6-only, which many ISPs/networks (this app's
target market included) can't reach without the paid IPv4 add-on, while the
Session pooler is IPv4-reachable and preserves the same one-connection-per-
session behaviour.

Everything else ADR 0001 required stays in force, because none of it was
actually about self-hosting — it was about correctness and portability:

- **Still one standard Postgres reached through Drizzle.** No Supabase-
  specific SQL, no `postgres.js`/Supabase client library in the app — the
  existing `pg`/`drizzle-orm/node-postgres` stack is unchanged, pointed at a
  different host.
- **Still the three-role split and RLS as the backstop.**
  `mhandisi_owner` / `app_runtime` / `maintenance` are created inside the
  Supabase project the same way `docker/postgres/init/00-roles.sql` /
  `scripts/bootstrap-db.ts` already do locally and in CI — Supabase's
  `postgres` role has the privileges to create them. The app's tables live
  in that project's existing `public` schema (Supabase's default database;
  we do not provision a second database inside the project — its pooler and
  dashboard tooling assume one).
- **Still no store-bundled auth.** Supabase Auth, Storage, Realtime, and
  Edge Functions are not used. better-auth keeps owning `auth_user` /
  sessions in the same Postgres, over the same session-mode connection —
  this is "Supabase as a Postgres host," not "Supabase as a backend."
- **Portability is unchanged.** The whole database is still one
  `pg_dump`/`pg_restore` away from another Postgres host — Supabase adds no
  proprietary schema the app relies on.

## Why (the trade-off, revisited)

- **Ops cost, not latency, was the deciding factor.** The per-query
  cross-region latency ADR 0001 warned about is accepted here as a known,
  deliberate cost — Supabase has no East-Africa region, same as every
  option surveyed in 2026-09. What changed is the weight given to it: a
  solo maintainer running a live product now values managed backups,
  point-in-time recovery, and patching over shaving round-trip time, now
  that the app is no longer mid-build.
- **A session-mode connection preserves the RLS mechanism.** `SET LOCAL
  app.current_account_id` inside a transaction is exactly as available over
  Supabase's direct connection or Session pooler (a normal long-lived `pg`
  `Pool`, same as today) as it was over the self-hosted container — this ADR
  does not touch `withAccount()`, the RLS policies, or the conformance
  tests. Only Supabase's Transaction pooler would break it, and the app
  does not use that mode.
- **The app hosting model is unchanged for now.** The app still runs as one
  long-running Node/Docker container (`web/README.md`'s Deployment
  section, `next.config.ts`'s `output: 'standalone'`) — this ADR only
  reopens ADR 0001's *data store* clause, not its *serverless-vs-container*
  clause. Moving the app itself onto a serverless platform is a separate,
  not-yet-made decision.

## Consequences

- **ADR 0001 is superseded on the data-store-category point only** — its
  role-split design, RLS mechanism, and portability requirement are carried
  forward unchanged and still binding.
- **`DATABASE_URL` / `APP_DATABASE_URL` / `MAINTENANCE_DATABASE_URL` point at
  the Supabase project's direct connection or Session pooler string**
  (`db.<project-ref>.supabase.co:5432` or `aws-0-<region>.pooler.supabase
  .com:5432` with username `<role>.<project-ref>`), never the Transaction
  pooler port (`6543`). Use `?sslmode=no-verify`, not `sslmode=require`: on
  current `pg`/`pg-connection-string`, `require` now means full
  certificate-chain verification, which fails against Supabase's pooler
  cert with "self-signed certificate in certificate chain"; `no-verify`
  keeps the connection encrypted without that check — no code change needed
  for TLS either way, it's purely a connection-string parameter.
- **`scripts/bootstrap-db.ts` targets the project's existing `postgres`
  database** (pass `database: "postgres"`, not the local default
  `"mhandisi"`) — Supabase projects are single-database; a second database
  would be invisible to Supavisor and the dashboard's table editor.
- **We still own the three roles' passwords and the RLS conformance test**;
  Supabase does not know about `app_runtime`/`maintenance`/`mhandisi_owner`
  beyond having created them — it does not manage tenant isolation for us.
- **Local development is unaffected.** `docker-compose.yml` / `docker/
  postgres/init/00-roles.sql` remain the default local-dev path; pointing
  `.env` at Supabase instead is an environment choice, not a code change.
