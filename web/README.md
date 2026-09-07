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

- **Database** — one standard PostgreSQL (ADR 0001). The app connects as the
  non-owner `app_runtime` role; migrations run as `mhandisi_owner`;
  session-less jobs (Phase 4) use `maintenance` (BYPASSRLS). Roles are
  infrastructure — `docker/postgres/init/00-roles.sql` locally,
  `scripts/bootstrap-db.ts` in CI / tests — never created by a migration.
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

This app does **not** deploy on Vercel. ADR 0001 fixes the target as one
long-running Node/Docker container co-located with Postgres, and
`next.config.ts` sets `output: 'standalone'`, which Vercel's build output step
does not support. `web/vercel.json` sets `ignoreCommand: "exit 0"` so that if
the Git integration is still connected, every push registers as a skipped
(not failed) deployment. Remove `vercel.json` and reconnect the integration
only if the deployment target is ever reconsidered. The `"//"` comment key that
used to hold this note was removed — Vercel's schema rejects unknown
properties.

## Design system

Follows **MHANDISI MAKINI** — `design-system/mhandisi-makini/MASTER.md`, source
of truth the `mhandisi-makini-design-system` skill. Runtime tokens in
`src/app/globals.css`; never hardcode a brand hex. Tagline: "Let's build
together".
