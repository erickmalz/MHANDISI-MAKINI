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

This is split like 2.4a/2.4b: **Part 1 (below) is schema-only**, done and
ready to verify. Parts 2–4 (DAL/actions/UI/sweep script) are **not started**
— per the standing rule, they get built only after Part 1's migration is
generated, applied and verified Windows-side, so nothing is layered on an
unverified column.

## Part 1 — schema (done in WSL, needs Windows-side migration)

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

## Part 3 — JSON data export (not started)

A Server Action / route handler that, `withAccount`, walks every
account-scoped table (same set the sweep will touch) and returns a single
JSON file download. Reuse for both the standalone "Export my data" button and
as step one of the deletion flow (ticket 02 — export offered first).

## Part 4 — deletion request + maintenance sweep (not started)

- **Request action**: re-enter password (via `getAuth().api` — same pattern
  as password change) + a typed confirmation phrase; sets
  `accounts.deletion_scheduled_at = now()`. Triggers the "deletion scheduled"
  email (ticket 02's email #4) with cancel instructions (= "sign back in").
- **Cancel on sign-in**: the sign-in Server Action (`src/app/actions/auth.ts`)
  clears `deletion_scheduled_at` back to null on any successful sign-in where
  it was set, before returning.
- **Sweep**: a standalone script (`web/scripts/sweep-deletions.ts`, mirroring
  `bootstrap-db.ts`'s shape) connecting as `maintenance` (bypasses RLS, sees
  every account), running:

  ```sql
  SELECT au.id FROM auth_user au
  JOIN accounts a ON a.user_id = au.id
  WHERE a.deletion_scheduled_at IS NOT NULL
    AND a.deletion_scheduled_at < now() - interval '30 days';
  -- then, per row: DELETE FROM auth_user WHERE id = $1;
  ```

  One `DELETE FROM auth_user` per candidate — cascades through `accounts`,
  `auth_session`, `auth_account`, and every domain table. Send the "deletion
  completed" email (ticket 02's email #4b) **before** deleting the row (the
  email address won't exist to read afterward). How this script gets
  scheduled (cron, a CI workflow_dispatch on a timer, a container sidecar) is
  a **deployment-shape decision, not yet made** (`.scratch/multi-tenancy/map.md`
  lists "Deployment Shape" as not yet specified) — out of scope for this
  slice beyond making the script itself runnable on demand.

## Open items to confirm before Part 2 starts

- Exact route path for the settings/profile screen (`/settings` vs
  `/account`) — no existing convention in this app yet.
- Logo upload constraints (max size, allowed MIME types) — not specified by
  ticket 02, needs a small product call or a conservative default (e.g. ≤1MB,
  PNG/JPEG only) stated plainly rather than assumed silently.
