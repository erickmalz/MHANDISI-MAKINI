# Admin Portal — Specification

Decisions: `.scratch/admin-portal/map.md` (5 tickets, all resolved). Extends
the already-shipped Platform Admin v1 (`.scratch/platform-admin/`, PR #7,
merged to `main`) — same identity and data model, expanded entry point and
capability set. This is a specification, not a build log; no code has been
written against it yet.

## 1. Background — what already exists (v1)

- `platform_admins` table (`auth_user_id` PK, `created_at`) — a flag on an
  existing `auth_user` row. No self-serve signup; every row inserted by
  hand.
- `/admin` route group: Account list (`page.tsx`), Account detail
  (`accounts/[id]/page.tsx`), one action — schedule Account deletion.
- `requirePlatformAdmin()` (`src/lib/auth/session.ts`): the session guard
  every admin route funnels through. Redirects to `/sign-in` with no
  session, to `/` if the session isn't flagged.
- `/sign-in` silently redirects a flagged user to `/admin` instead of Choose
  Project on successful sign-in (`resolvePostSignInRedirect`).
- Platform Admin never sees Project/financial domain data — only
  Account-level metadata (Engineer name/phone, linked email, created date,
  live project count, Terms-acceptance, deletion-scheduled status).

## 2. Entry point, login & session model

- **Button**: a small link on `/sign-in` (e.g. "Admin sign in") to a new
  `/admin/login` route.
- **`/admin/login`**: its own page and form (own layout, consistent with
  `/admin`'s route-group styling, not `AppChrome`) — visually and
  structurally separate from `/sign-in`. Submits through the same
  `authClient.signIn.email` (better-auth) call. **No new credential store**
  — one `auth_user` identity, reached through a second door.
- On success, routes unconditionally to `/admin` (skips the Choose-Project
  branch). If the identity isn't flagged, redirect to `/` — generic, no
  enumeration of account existence or admin status.
- `/sign-in`'s existing silent redirect **stays** as a second working path;
  one person can be both Engineer and admin.
- Session/credential mechanism **unchanged**: same better-auth session, same
  `requirePlatformAdmin()` guard, no separate cookie, no MFA, no IP
  allowlisting, no shortened session lifetime.
- `proxy.ts`'s optimistic cookie-presence redirect gains a check for
  `/admin/login`: an authenticated visitor hitting it goes to `/admin`
  instead of `/` (closes the admin-only-identity dead-end noted in v1's
  `status.md`).
- **Cleanup**: remove the leftover `TEMP DIAGNOSTIC` `console.error` in
  `requirePlatformAdmin()`.

## 3. Capabilities matrix — what a Platform Admin can access and change

| Area | v1 (today) | This rebuild adds |
|---|---|---|
| Account list/detail | Read-only: name, phone, email, created date, project count, Terms acceptance, deletion status | Unchanged |
| Account deletion | Schedule only | **Cancel** scheduled deletion (mirrors the existing self-serve cancel) |
| Engineer notification | None sent on admin action | **Email on schedule and on cancel**, new copy naming support as the actor (English-only plain text, matching every existing email) |
| Other admins | Invisible — no UI | **List, add (by email), remove** — cannot remove your own row |
| Admin activity | Untracked | **Audit log**: every admin mutation recorded, visible on an admin-only Activity view |
| Project/financial domain data | Never visible | **Still never visible** — unchanged boundary |
| Impersonation | None | **Still not built** — deferred, needs its own decision |
| MFA / sign-in hardening | None | **Still not built** — deferred |
| Global config / operational visibility | None | **Still not built** — deferred, out of this destination |

## 4. Data model changes

- `platform_admins`: add `added_by` (`text`, nullable, FK `auth_user.id`;
  null for the out-of-band-provisioned first row).
- New table `admin_audit_log`:
  - `id`
  - `actorAuthUserId` — FK `auth_user.id`
  - `action` — `schedule_deletion` | `cancel_deletion` | `add_admin` |
    `remove_admin`
  - `targetAccountId` — nullable, FK `accounts.id` (set for deletion
    actions)
  - `targetAuthUserId` — nullable, FK `auth_user.id` (set for
    add/remove-admin actions)
  - `createdAt`
  - Not RLS-scoped (same posture as `platform_admins` — no `account_id` to
    scope by; gated at the application layer).

## 5. New routes & actions

- `src/app/admin/login/page.tsx` — the new login form.
- `src/app/admin/admins/page.tsx` — list/add/remove Platform Admins.
- `src/app/admin/activity/page.tsx` — read-only audit log view.
- `src/app/admin/actions.ts` additions: `cancelAccountDeletionAction`,
  `addAdminAction`, `removeAdminAction`.
- `src/lib/data/platform-admin.ts` additions: `cancelAccountDeletionForAdmin`,
  `listPlatformAdmins`, `addPlatformAdmin(email)`,
  `removePlatformAdmin(authUserId)`, plus an `admin_audit_log` write inside
  every one of the above (including the existing
  `scheduleAccountDeletionForAdmin`).
- `src/app/actions/auth.ts`: a sibling to (or parameter on)
  `resolvePostSignInRedirect` for `/admin/login`'s unconditional-on-success
  path.
- `proxy.ts`: one additional path check for `/admin/login`.
- `src/lib/auth/emails.ts` gains `sendAdminScheduledDeletionEmail` /
  `sendAdminCancelledDeletionEmail` — plain English, no i18n keys (matches
  every existing transactional email).

## 6. Explicitly out of scope

- Impersonation (seeing/acting inside an Engineer's Project/financial data).
- MFA, IP allowlisting, shortened admin session lifetime.
- `/admin` visual/UI redesign beyond the new screens above.
- Operational visibility (errors, background-job/health status).
- Global config / cross-Account content management (e.g. shared stage
  templates).

Any of these could become their own future map if a real need surfaces —
none blocks this rebuild.

## 7. Build-order note

Not sliced into a runbook here (this document is the spec, not the plan) —
whoever builds this should follow the same order the map's tickets resolved
in: entry point/session model (§2) first (nothing else depends on it),
then admin-management (§4's `added_by`, §5's admins routes) and cancel-
parity in either order, audit log last (it depends on every action existing
to log), notification email wherever convenient once schedule/cancel exist.
Land and verify each migration before building the DAL on top of it, per
this repo's standing rule (`.scratch/platform-admin/status.md`).
