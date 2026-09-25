# Admin Portal — build status

Decisions: `.scratch/admin-portal/map.md` (5 tickets, all resolved), full
spec at `.scratch/admin-portal/spec.md`. Extends the already-shipped
Platform Admin v1 (`.scratch/platform-admin/`, PR #7, merged to `main`).

Same environment constraint as every prior effort
(`.scratch/platform-admin/status.md`): `web/node_modules` is Windows-built,
so only `tsc`/`eslint`/`vitest` (the DB-free suites) run in WSL —
`db:migrate`, the Testcontainers isolation suite, and `npm run build`
verification go through CI's own throwaway Postgres. No Docker daemon is
reachable from this WSL session either, so the isolation suite
(`tests/isolation/conformance.test.ts`) could not be run locally at all this
time — same as `db:migrate`. Migration `0012_admin_portal` was generated via
the isolated-Linux-drizzle-kit scratch procedure (throwaway `package.json` +
`drizzle.config.ts` + `src/lib/data/schema/` + `drizzle/` copy, `npm install
--ignore-scripts`, then the real `npx drizzle-kit generate --name
admin_portal`), diffed against `0011`'s snapshot — the only generated
differences are the new `admin_audit_log` table and
`platform_admins.added_by`. The `SECURITY DEFINER` functions (audit-log
writer, cancel/add/remove-admin, the two list functions, and a redefinition
of `schedule_account_deletion_for_admin` to also log and report whether it
changed anything) were hand-appended, same pattern as `0011`.

## Scope

One slice — the map's five tickets are one cohesive rebuild, not several
independent ones.

## What's built

- **Entry point** (ticket 01): `/admin/login` (`src/app/admin/login/page.tsx`)
  — its own form, same better-auth credential, unconditional `/admin` (or
  `/`, no enumeration) redirect via the existing `resolvePostSignInRedirect`.
  Linked from `/sign-in` (`auth.signIn.adminLogin`, EN+SW). The existing
  `/admin` screens were moved into an `(protected)` route group
  (`src/app/admin/(protected)/...`) so `requirePlatformAdmin()`'s layout
  guard doesn't also gate the login page itself — URLs are unchanged, only
  file locations moved. `proxy.ts` allowlists `/admin/login` and redirects an
  already-signed-in visitor there to `/admin` (closes the admin-only-identity
  dead end noted in the v1 status doc). Removed the leftover `TEMP
  DIAGNOSTIC` `console.error` from `requirePlatformAdmin()`.
- **Schema**: `platform_admins.added_by` (nullable FK, provenance) and the
  new `admin_audit_log` table (`src/lib/data/schema/admin-audit-log.ts`),
  neither RLS-scoped (added as a second/third documented exception in
  `tests/isolation/conformance.test.ts`, alongside `accounts` and the
  existing `platform_admins` exception).
- **Migration `0012_admin_portal`**: the generated `CREATE TABLE`/`ALTER
  TABLE` + hand-appended block — `app.log_admin_action` (shared audit
  writer), `app.cancel_account_deletion_for_admin` (ticket 03),
  `app.add_platform_admin` / `app.remove_platform_admin` (ticket 02, the
  latter with a self-removal guard), `app.list_platform_admins` /
  `app.list_admin_audit_log` (read views), and a redefinition of
  `app.schedule_account_deletion_for_admin` (same signature, now also logs
  and returns whether it actually changed anything — used to decide whether
  to send the notification email).
- **DAL** (`src/lib/data/platform-admin.ts`): `cancelAccountDeletionForAdmin`,
  `listPlatformAdmins`, `addPlatformAdmin`, `removePlatformAdmin`,
  `listAdminAuditLog`; `scheduleAccountDeletionForAdmin` now returns
  `boolean`.
- **Emails** (`src/lib/auth/emails.ts`, ticket 04):
  `sendAdminScheduledDeletionEmail` / `sendAdminCancelledDeletionEmail` —
  plain English, no i18n keys, matching every existing transactional email
  (the app's bilingual UI does not extend to emails; corrected an initial
  assumption in the ticket/spec that they would).
- **Server Actions** (`src/app/admin/actions.ts`): `cancelAccountDeletionAction`
  and `scheduleAccountDeletionAction` (now sends the matching email, skipped
  on a no-op), `addAdminAction`, `removeAdminAction`.
- **Routes**: `/admin/admins` (list, `AddAdminForm` client component, inline
  remove — no confirmation dialog anywhere in this codebase, so none added
  here), `/admin/activity` (read-only audit list). Account detail page
  (`/admin/accounts/[id]`) gained the "Cancel scheduled deletion" button.
  Admin layout header gained Accounts/Admins/Activity nav links.

## Known gaps (match the map's "Not yet specified" — not omissions)

- Impersonation, MFA/sign-in hardening, `/admin` visual redesign,
  operational visibility, and global config remain explicitly out of scope
  — unchanged from v1, re-deferred by this map's tickets 01 and 03 (Q7 in
  the grilling record).

## Verification

- `npm run typecheck` (`next typegen && tsc --noEmit`): **clean.**
- `npx eslint .`: **clean.**
- `npx vitest run tests/ui`: **34/34 passing** (all four DB-free suites,
  including `i18n.test.ts` covering the new `adminLogin` key pair).
- **Not run locally**: `tests/isolation/conformance.test.ts` (needs Docker,
  unavailable in this WSL session), `db:migrate`, `npm run build`. These go
  through CI on the PR, same as every prior migration in this repo — land
  and verify there before treating this as done.

Not yet committed or pushed — this session built and self-checked
(typecheck/lint/unit tests) but has not opened a branch/PR. Next step is a
branch + PR so CI can run the migration, the isolation suite, and the build.
