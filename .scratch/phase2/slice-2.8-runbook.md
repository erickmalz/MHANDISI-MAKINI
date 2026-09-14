# Slice 2.8 — Account lifecycle (ticket 02) — runbook

Scope (per `.scratch/phase2/status.md`'s ledger — the narrower, "already
built" lifecycle steps are excluded; see `.scratch/multi-tenancy/issues/02-account-lifecycle.md`
for the full ticket):

1. **Profile edit** — name / phone / logo, the fields `getDocumentProfile`
   reads for the issued-document letterhead (2.7 deliberately left logo +
   email to this slice).
2. **JSON data export** — "Export my data" in settings; a single JSON file of
   the Account's rows.
3. **Self-serve account deletion** — re-enter password + confirmation phrase,
   export offered first, 30-day grace period, any sign-in during the window
   cancels it, and a **maintenance-role sweep** that hard-deletes accounts
   past the grace period.

This is split like 2.4a/2.4b. **Parts 1–3 are done** (Part 1's migration
`0004` generated, applied and verified Windows-side; Part 2 committed
`8721210`; Part 3 is pure code on top of already-verified schema, no
migration of its own). **Part 4 is code-complete except the sign-in-cancels
piece**, which needs its own migration (`0005` — a SECURITY DEFINER function
+ a grant, not a schema change) before it can be safely wired in — see
Part 4 below for exactly what is and isn't safe yet.

## Part 1 — schema (done + verified)

`web/src/lib/data/schema/accounts.ts` — three new columns on `accounts`:

- `logo` (`bytea`, nullable) + `logo_content_type` (`text`, nullable) — the
  Account's letterhead logo, stored as raw bytes in Postgres. **Decision**:
  no S3/blob/CDN exists in this self-hosted, single-container app (ADR 0001),
  and a logo is small, so bytea in Postgres avoids new infra. Confirmed with
  the user rather than assumed — the phase1 decision map explicitly left
  "image storage/CDN" as a future call.
- `deletion_scheduled_at` (`timestamptz`, nullable) — null = not scheduled;
  set by the delete-account action, cleared by any successful sign-in while
  set (ticket 02's "signing in cancels it"), read by the sweep.

No new tables. Every domain table already cascades from `accounts.id`
(directly or transitively), and `accounts` itself cascades from
`auth_user.id` — so the sweep's hard-delete is a single statement (see
Part 4), not a manual per-table sweep.

`tsc --noEmit` and `eslint` both confirmed clean in WSL (the only `tsc`
errors are the pre-existing, expected `Cannot find module 'puppeteer'` ones
that every slice since 2.7 has — Windows/CI-side only).

### Generate + apply the migration (Windows-side)

```powershell
cd web
npm run db:generate -- --name account_lifecycle
```

Expect one file, `web/drizzle/0004_account_lifecycle.sql`, adding the three
columns above — no renames, no other tables touched. Then **append this
grant** to the end of that generated file before applying it (drizzle-kit
doesn't track grants, same pattern 0001 and 0002 used):

```sql
--> statement-breakpoint
-- Slice 2.8: the maintenance-role sweep hard-deletes an account past its
-- 30-day grace period by deleting the auth_user row — everything else
-- (accounts, sessions, and every domain table) cascades from there.
-- `maintenance` only had SELECT before this (migration 0001); this is the
-- one additional write it needs, scoped to a single table.
GRANT DELETE ON "auth_user" TO maintenance;
```

Then:

```powershell
docker compose up -d      # if not already running
cd web
npm run db:migrate
npm test                  # isolation suite — confirm nothing else regresses
npm run lint
npm run typecheck
npm run build
```

Expected: `db:migrate` — "Migrations applied." with no error; everything else
green (no schema-shape change any existing table/test depends on).

**Report back** the `db:generate` / `db:migrate` output (paste it) so the
exact migration filename + grant are confirmed landed before Part 2 starts.

## Part 2 — profile edit (not started)

DAL: extend `web/src/lib/data/documents.ts`'s `DocumentProfile` /
`readProfile` with `logoContentType` + logo bytes (base64 or a data URL for
the `<img>` src in the print templates) and `email` (from `auth_user`, joined
in the same `withAccount` transaction). New write DAL
(`src/lib/data/account-profile.ts` or similar): `getAccountProfile` /
`updateAccountProfile` (name, phone) / `updateAccountLogo` (multipart file
upload → bytes + content-type, with a size + MIME allowlist — this is a
Server Action accepting `FormData`, not JSON, since it carries a `File`).

UI: a new `/settings` (or `/account`) route + form, linked from `AppChrome`.

## Part 3 — JSON data export (done)

`src/lib/data/export.ts`'s `exportAccountData()` — `withAccount`, selects
every account-scoped table (the authoritative "what does an Account own"
list — kept in sync with the sweep's cascade) plus the profile (name/phone/
email; logo bytes excluded, `hasLogo`/`logoContentType` noted instead).
`src/app/(app)/settings/export/route.ts` serves it as a
`Content-Disposition: attachment` download, gated the same way as
`/settings/logo` (DAL throws `NotAuthenticatedError` → 404, no session
leak). `DataExportCard` on `/settings` links to it with a plain `<a>`
(matching `DocumentDownloads`, not `Button href`/`next/link` — the browser
needs a real navigation to treat the response as a file). No migration
needed — pure code on top of already-verified schema. Reused as-is for step
one of the deletion flow (ticket 02 — export offered first; the UI doesn't
force the click, same as the ticket's wording).

## Part 4 — deletion request + maintenance sweep

**Code written; needs its own migration (`0005`) before the sign-in-cancels
piece can be wired in.** Unlike Part 1 → Part 2/3, this isn't "schema, then
code" — the `deletion_scheduled_at` column already landed and is verified
(Part 1). What's new here is two *privileged* pieces (a SECURITY DEFINER
function + a grant), and only one narrow slice of code depends on them being
live, so the rest could be written now:

- **Request action** (done): `requestAccountDeletionAction`
  (`src/app/actions/account.ts`) re-verifies the password (`auth_account`'s
  stored hash, via the new `verifyCurrentUserPassword` in
  `src/lib/auth/verify-password.ts` — there's no better-auth endpoint that
  checks a password without also changing it or minting a session) and a
  typed confirmation — **the Account's own email**, not an arbitrary phrase
  (a product default this brief sets; see `accountDeletionInputSchema`'s doc
  comment in `src/lib/validation/account.ts` for why). On success it calls
  `scheduleAccountDeletion()` (`src/lib/data/account-deletion.ts` — a plain
  RLS-scoped write, no new grant needed) and sends the "deletion scheduled"
  email (`sendDeletionScheduledEmail`, `src/lib/auth/emails.ts`). UI:
  `AccountDeletionForm` on `/settings`, showing the scheduled notice instead
  of the form once set.
- **Cancel on sign-in** (**blocked on the migration below — do not wire yet**):
  sign-in doesn't go through one of our Server Actions — `sign-in/page.tsx`
  calls `authClient.signIn.email` straight to better-auth's own route. **Now
  wired**: `databaseHooks.session.create.after` in `src/lib/auth/index.ts`
  calls `app.cancel_account_deletion(session.userId)` via `db.execute`. This
  went in together with migration `0005` below in the same commit — the two
  can't be separated (the hook throws on every sign-in until the function
  exists), so this only landed once the migration was generated and its
  content confirmed correct.
- **Sweep** (done, but only runnable once the migration below lands):
  `web/scripts/sweep-deletions.ts` (mirrors `bootstrap-db.ts`'s shape),
  connects as `maintenance` via `MAINTENANCE_DATABASE_URL` (already in
  `.env.example`, marked "unused until Phase 4"), runs the join from the
  original plan, sends "deletion completed" (`sendDeletionCompletedEmail`)
  **before** each delete (the address won't exist to read after), then one
  `DELETE FROM auth_user` per candidate — cascades through `accounts`,
  `auth_session`, `auth_account`, and every domain table (see
  `src/lib/data/export.ts`'s table list for the full set that disappears).
  `npm run db:sweep` runs it. How it gets scheduled (cron, a CI
  `workflow_dispatch` on a timer, a container sidecar) is a
  **deployment-shape decision, not yet made** — out of scope here beyond
  making the script runnable on demand.

### Migration `0005` — generated, not yet applied to any real database

This one has no Drizzle schema change to diff (same situation as `0001`'s RLS
+ provisioning migration), so it was generated **custom**, empty, then
hand-filled — but *not* via the project's own `web/node_modules` (Windows-built
native binaries don't run under WSL). Instead: a throwaway copy of
`package.json` + `drizzle.config.ts` + `src/lib/data/schema/` + the existing
`drizzle/` folder in a scratch directory, `npm install` there (a genuine
Linux-native `drizzle-kit`/`esbuild`, isolated from the real `web/node_modules`
so the Windows dev setup is untouched), then the real
`npx drizzle-kit generate --custom --name account_deletion_privileges` — the
actual tool, not hand-typed journal/snapshot JSON. The resulting
`0005_snapshot.json` was diffed against `0004_snapshot.json` to confirm only
the `id`/`prevId` chain fields differ (no accidental schema drift), before
copying the three generated files (`.sql`, the new snapshot, `_journal.json`)
back into `web/drizzle/`.

**Still needed**: `db:migrate` has not run against any real Postgres yet.
Slice 2.7's investigation found the local dev Postgres is reachable from this
WSL sandbox on `localhost:5432` with real data in it (2 accounts) — deliberately
**not** touched. Verification instead goes through the same channel every
prior slice's migration was ultimately proven by: pushing to
`phase2-domain-structure` and letting `.github/workflows/ci.yml`'s `web` job
apply migrations + run the isolation suite + `build` against its own
throwaway `postgres:16` service container. Confirm the CI run is green on this
push before treating `0005` as landed (same bar as every other slice).

The body that was hand-written into the generated empty file:

```sql
-- Slice 2.8 Part 4 (ticket 02) — the two privileged pieces self-serve account
-- deletion needs beyond the plain RLS-scoped write the request action already
-- does (src/lib/data/account-deletion.ts):
--
--   1. Cancelling on sign-in has no account context yet — same chicken-and-egg
--      as app.record_terms_acceptance in migration 0001 — so it needs a
--      SECURITY DEFINER function, called from better-auth's
--      `databaseHooks.session.create.after` (src/lib/auth/index.ts).
--   2. The maintenance-role sweep (scripts/sweep-deletions.ts) hard-deletes a
--      row past its grace period by deleting `auth_user`. `maintenance` had
--      only SELECT on `accounts` before this (migration 0001); it now also
--      needs SELECT on `auth_user` (to find + email expired candidates) and
--      DELETE on `auth_user` (every other table cascades from there).

CREATE OR REPLACE FUNCTION app.cancel_account_deletion(p_user_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	UPDATE public.accounts
	SET deletion_scheduled_at = NULL
	WHERE user_id = p_user_id
	  AND deletion_scheduled_at IS NOT NULL;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.cancel_account_deletion(text) TO app_runtime;
--> statement-breakpoint
GRANT SELECT, DELETE ON "auth_user" TO maintenance;
```

`tsc --noEmit` and `eslint` are clean in WSL on the hook + migration together.
`db:migrate` / `npm test` / `npm run build` are pending the CI run on this
push (see above — not run against the local dev Postgres on purpose). Once
that CI run is green, Part 4 is fully closed; a manual sign-in smoke test
(confirm a scheduled deletion actually clears) is still worth doing whenever
someone is next at a machine that can run `npm run dev`, but is no longer
blocking — the same CI job that verifies the migration also runs the
isolation suite, which is the project's bar for "verified" everywhere else.

## Product defaults stated along the way (not silently assumed)

- **Settings route**: `/settings` (Part 2). No existing convention before
  this slice; nothing else claims the path.
- **Logo upload constraints**: ≤1MB, PNG/JPEG only (Part 2,
  `src/app/actions/account.ts`).
- **Deletion confirmation phrase**: the Account's own sign-in email, not an
  arbitrary literal (Part 4, `accountDeletionInputSchema`'s doc comment in
  `src/lib/validation/account.ts`) — ticket 02 names the requirement ("a
  confirmation phrase") but not the exact text.
