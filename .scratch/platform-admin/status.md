# Platform Admin — build status

Decisions: `.scratch/platform-admin/map.md` (3 tickets, all resolved). Same
environment constraint as every prior effort (`.scratch/phase4/status.md`):
`web/node_modules` is Windows-built, so only `tsc`/`eslint` run in WSL —
`db:migrate`, `npm test`, `npm run build` verification goes through CI's own
throwaway Postgres. Migration `0011_platform_admin` was generated via the
isolated-Linux-drizzle-kit scratch procedure (throwaway `package.json` +
`drizzle.config.ts` + `src/lib/data/schema/` + `drizzle/` copy, `npm install
--ignore-scripts`, then the real `npx drizzle-kit generate --name
platform_admin`), diffed against `0010`'s snapshot — the only difference is
the new `platform_admins` table and its FK. Land and verify the migration
before building the DAL on top of it, per the standing rule.

## Scope

One slice — the map's three tickets are one cohesive feature, not several
independent ones.

## What's built

- **Schema**: `platform_admins` table (`src/lib/data/schema/platform-admins.ts`),
  keyed by `auth_user_id`, no RLS (ticket 01).
- **Migration `0011_platform_admin`**: the generated `CREATE TABLE` +
  hand-appended block — `GRANT SELECT` on `platform_admins` to
  `app_runtime`, and two `SECURITY DEFINER` functions:
  - `app.list_accounts_for_admin(admin_auth_user_id)` — every Account +
    joined `auth_user` email + a live per-Account project count. `accounts`
    is ENABLE-only (not FORCE, ADR 0004), so the owner-run function already
    reads every row with no new policy; `projects` IS FORCE'd, so the count
    is taken by setting `app.current_account_id` to each Account's own id
    in turn inside a loop and letting the existing `account_isolation`
    policy do its job, rather than adding an admin-bypass policy to
    tenant-critical data. Re-checks `platform_admins` membership itself.
  - `app.schedule_account_deletion_for_admin(admin_auth_user_id,
    account_id)` — the mirror image of `app.cancel_account_deletion`
    (migration `0005`), reusing `accounts.deletion_scheduled_at`.
- **DAL**: `src/lib/data/platform-admin.ts` — `isPlatformAdmin`,
  `listAccountsForAdmin`, `getAccountForAdmin`,
  `scheduleAccountDeletionForAdmin`. Not `withAccount`-scoped.
- **Session guard**: `requirePlatformAdmin()` added to
  `src/lib/auth/session.ts` — redirects to `/sign-in` without a session, to
  `/` without the flag (ticket 02).
- **Sign-in redirect**: `resolvePostSignInRedirect()` Server Action
  (`src/app/actions/auth.ts`), called from `src/app/sign-in/page.tsx` after
  `authClient.signIn.email` succeeds — `/admin` for a Platform Admin, `/`
  for everyone else (ticket 02).
- **`/admin` route group**: `layout.tsx` (own chrome, not `AppChrome`),
  `page.tsx` (Account list), `accounts/[id]/page.tsx` (detail + the one
  admin action), `actions.ts` (`scheduleAccountDeletionAction`) — ticket 03.
- **`CONTEXT.md`**: the **Platform Admin** glossary entry (done during
  charting, not this build).

## Known gaps (match the map's "Not yet specified" — not omissions)

- No notification email is sent when an admin schedules a deletion (the
  self-serve flow's `sendDeletionScheduledEmail` copy assumes the Engineer
  themselves asked — reusing it verbatim would be wrong, and whether/what to
  send is explicitly undecided on the map).
- `proxy.ts`'s optimistic redirect (authenticated visitor hitting
  `/sign-in` → `/`) is unchanged and does not know about the admin flag
  (it's cookie-presence-only by design, ADR 0002). An admin-only identity
  with no Engineer Account of their own who revisits `/sign-in` while
  already signed in would land on `/` and hit `NotAuthenticatedError` from
  Choose Project — not fixed here; low-probability (today's one Platform
  Admin is expected to also be an Engineer with their own Account) and not
  something any of the three tickets decided.
- No admin-management UI, no impersonation, no audit log — all explicitly
  out of v1 per the map.

## Provisioning the first Platform Admin

Out-of-band, by design (ticket 01) — after this migrates, insert one row by
hand:

```sql
INSERT INTO platform_admins (auth_user_id)
SELECT id FROM auth_user WHERE email = '<your email>';
```

## Verification

- `npm run typecheck` (`next typegen && tsc --noEmit`): **clean.**
- `npm run lint`: **clean.**
- **CI-verified**: PR #7 (`platform-admin` branch,
  `https://github.com/erickmalz/MHANDISI-MAKINI/pull/7`), CI run
  `35270856423` green — migrations (incl. `0011`), lint, typecheck, the
  isolation suite, and `npm run build` all ✓.

Two fixes landed on top of the initial build, both caught by CI rather than
local checks (this branch was cut after fast-forwarding past the Fly.io
Launch merge, PR #6, which local `tsc`/`eslint` had already run before):

- `web/eslint.config.mjs` now excludes `dbsetup.js` (Fly.io's generated
  CommonJS launch wrapper) from lint — pre-existing, unrelated to Platform
  Admin.
- `tests/isolation/conformance.test.ts` — the build-blocking RLS-conformance
  sweep correctly flagged `platform_admins` as skipping standard tenant
  isolation. Encoded it as a second, documented exception (alongside
  `accounts`) with its own dedicated assertions, rather than weakening the
  sweep.

**This closes Platform Admin's build order.** All 3 tickets (01–03) plus
the build are done, merged into CI-verified state on PR #7 — merge to
`main` when ready.
