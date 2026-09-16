# Mhandisi Makini — web

Next.js 16 (App Router). Construction project management for the site engineer.

## Running locally

You need Docker (for the database) and Node 20.9+.

```bash
# 1. Start Postgres (creates the mhandisi database + the three roles on first boot)
docker compose up -d            # from the repo root

# 2. Configure and install
cd web
cp .env.example .env            # then set BETTER_AUTH_SECRET — `openssl rand -base64 32`
npm install

# 3. Apply migrations, then run
npm run db:migrate
npm run dev                     # http://localhost:3000
```

First run: open `/sign-up`, create an account. With `RESEND_API_KEY` unset (the
default) the **verification link is printed to the server console** instead of
emailed — open it there. The rest of the app works before verifying; the link
only unlocks password reset and email change. After 7 days unverified, the app
is gated behind a full-screen "verify to continue".

### Scripts

| script | what |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | eslint / `next typegen && tsc --noEmit` |
| `npm test` | the tenant-isolation suite (Testcontainers — needs Docker) |
| `npm run db:generate` | new Drizzle migration from a schema change |
| `npm run db:migrate` | apply `drizzle/` migrations (as the schema owner) |
| `npm run db:studio` | Drizzle Studio |

## Architecture (Phase 1 of the multi-tenancy build)

- **Database** — one standard PostgreSQL, hosted on a Supabase project via
  its direct (non-pooled) connection (ADR 0006, superseding ADR 0001's
  self-hosting clause; the role split, RLS mechanism, and portability
  requirement ADR 0001 set are unchanged). The app connects as the
  non-owner `app_runtime` role; migrations run as `mhandisi_owner`;
  session-less jobs (Phase 4) use `maintenance` (BYPASSRLS). Roles are
  infrastructure — `docker/postgres/init/00-roles.sql` for local Docker
  Postgres, `scripts/bootstrap-db.ts` for CI / tests / a Supabase project —
  never created by a migration.
- **Auth** — better-auth, self-hosted, tables prefixed `auth_` (ADR 0002).
  Opaque DB-backed session cookie, 7-day sliding, 60s cookie cache; argon2id;
  DB-backed rate limiter. `src/proxy.ts` does an optimistic cookie check only;
  `requireUsableSession()` / `verifySession()` (`src/lib/auth/session.ts`) is
  the authoritative check every server entry point goes through.
- **Tenancy** — a dedicated `accounts` table, 1:1 with `auth_user`, created by
  an `AFTER INSERT` trigger (ADR 0004). Every account-scoped read/write (Phase
  2 onward) goes through `withAccount()` (`src/lib/data/with-account.ts`), which
  sets `app.current_account_id` as statement 1 of a transaction; Postgres
  row-level security is the backstop. `getCurrentAccountId()` is never a
  function parameter.
- **The prototype screens** (`src/app/(app)/**`) still read the mock data in
  `src/lib/{mock-data,funding-mock,procurement-mock}.ts`. Phase 2 replaces
  those with the data-access layer and deletes the mock files.

The decisions being built are in `.scratch/multi-tenancy/map.md` and
`docs/adr/`.

## Deployment

This app does **not** deploy on Vercel. ADR 0001 fixes the app's hosting
target as one long-running Node/Docker container (unchanged by ADR 0006 —
only the *database's* host moved to Supabase, not the app's), and
`next.config.ts` sets `output: 'standalone'`, which Vercel's build output step
does not support. `web/vercel.json` sets `ignoreCommand: "exit 0"` so that if
the Git integration is still connected, every push registers as a skipped
(not failed) deployment. Remove `vercel.json` and reconnect the integration
only if the deployment target is ever reconsidered. The `"//"` comment key that
used to hold this note was removed — Vercel's schema rejects unknown
properties.

### Database: Supabase (ADR 0006)

The database is a Supabase project's standard Postgres, reached over a
**session-mode connection** — either its plain direct connection (IPv6
only) or its **Session pooler** (IPv4-reachable; use this one unless you
know your network has IPv6) — never the **Transaction pooler** (port 6543),
which breaks the `SET LOCAL`-based RLS mechanism this app depends on.

1. Create a Supabase project. From its dashboard, Project Settings →
   Database → Connection string → copy the **Session pooler** URI (falls
   back to the plain direct-connection URI only if you have working IPv6).
   The Session pooler string looks like
   `postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`.
2. Bootstrap the three roles inside it (same roles as local Docker, via
   `scripts/bootstrap-db.ts` — see that file's header):
   ```bash
   SUPERUSER_DATABASE_URL="<connection string from step 1>" \
   BOOTSTRAP_DATABASE_NAME=postgres \
     npx tsx scripts/bootstrap-db.ts
   ```
   This creates `mhandisi_owner` / `app_runtime` / `maintenance` and hands
   `public` + `app` to the owner, inside the project's existing `postgres`
   database (Supabase projects are single-database — do not create a second
   one; Supavisor and the dashboard's table editor only see `postgres`).
3. Set `DATABASE_URL` / `APP_DATABASE_URL` / `MAINTENANCE_DATABASE_URL` in
   `.env` (or your production environment) to that same host/port/database,
   swapping in each role's own username and password. Over the Session
   pooler the username is `<role>.<project-ref>` (e.g.
   `app_runtime.dwxughcdovfltohyhksv`), not just the bare role name — see
   `.env.example`.
4. `npm run db:migrate` (as `DATABASE_URL` / `mhandisi_owner`) applies the
   existing `drizzle/` migrations unchanged — nothing in them is
   Supabase-specific.

## Design system

Follows **MHANDISI MAKINI** — `design-system/mhandisi-makini/MASTER.md`, source
of truth the `mhandisi-makini-design-system` skill. Runtime tokens in
`src/app/globals.css`; never hardcode a brand hex. Tagline: "Let's build
together".
