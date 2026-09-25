# Admin Portal (rebuild) — Decision Map

Wayfinder decision map. Tracker: local markdown (`.scratch/admin-portal/`).
Started 2026-09-25.

## Destination

A **specification MD file** (`.scratch/admin-portal/spec.md`) for rebuilding
the Platform Admin surface: a visible entry point from the login page into
its own login page, and an expanded capabilities matrix covering everything
a Platform Admin can view and change. This **extends and revises** the
already-shipped Platform Admin v1 (`.scratch/platform-admin/`, PR #7, merged
to `main`) — same `platform_admins` identity and data model, not a parallel
system. It reopens two of v1's settled decisions (no separate auth entry, no
admin-management UI) and answers "what can admin access and change" more
fully than v1's read-only scope.

## Notes

- **Build state this map is written against**: Platform Admin v1 is live —
  `platform_admins` table (`auth_user_id` PK, `created_at`), `/admin` route
  group (`layout.tsx`, `page.tsx` Account list, `accounts/[id]/page.tsx`
  detail, `actions.ts`), `requirePlatformAdmin()` session guard
  (`src/lib/auth/session.ts`), `resolvePostSignInRedirect()`
  (`src/app/actions/auth.ts`) called from the existing `/sign-in` page. One
  admin action exists today: schedule Account deletion. See
  `.scratch/platform-admin/map.md` and `status.md` for the full v1 record —
  this map does not restate it, only what changes.
- **Decision-maker**: resolved in this session by running the `grilling`
  design-tree method (destination-naming, then breadth-first across the
  frontier) and **taking the firm recommendation on each round as the
  decision**, per the user's explicit instruction and standing preference on
  this kind of ticket (memory
  `mhandisi-makini-grilling-accept-recommendations`) — same precedent as
  `.scratch/platform-admin/map.md`. All five tickets below were resolved
  live during charting, across two grilling rounds, because the user's
  stated destination for *this* map is a finished spec, not an open ticket
  queue.
- **Every ticket is `grilling`.**
- **This map plans, it does not build** — same discipline as every prior
  map in this repo. The `platform_admins` migration (`added_by` column),
  the new `admin_audit_log` table, `/admin/login`, `/admin/admins`,
  `/admin/activity`, and the email copy are a downstream build effort; a
  `.scratch/admin-portal/status.md` follows once building starts.
- **Domain vocabulary unchanged**: `CONTEXT.md`'s existing **Platform
  Admin** entry (added by the v1 map) already covers this role precisely —
  nothing here introduces a new glossary term. The portal is that role's UI
  surface, not a new domain concept.

## Tickets

1. [Admin entry point, login page & session model](./issues/01-admin-entry-point-login-and-session-model.md)
2. [Admin-management — create, list, remove Platform Admins](./issues/02-admin-management.md)
3. [Deletion-action parity — cancel scheduled deletion](./issues/03-cancel-deletion-parity.md)
4. [Notify the Engineer when an admin schedules or cancels their deletion](./issues/04-notify-engineer-on-admin-deletion-action.md)
5. [Audit log of Platform Admin actions](./issues/05-admin-audit-log.md)

## Decisions so far

- [Admin entry point, login page & session model](./issues/01-admin-entry-point-login-and-session-model.md):
  A link on `/sign-in` routes to a new `/admin/login` page — its own form,
  same better-auth credential (no new credential store), unconditional
  `/admin` redirect on success. `/sign-in`'s existing silent redirect stays
  as a second front door. No MFA/hardening, no separate session shape.
  `proxy.ts` gets a matching optimistic-redirect fix for `/admin/login`.
- [Admin-management — create, list, remove Platform Admins](./issues/02-admin-management.md):
  New `/admin` "Admins" view: list, add (by email), remove (hard delete);
  can't remove your own row. `platform_admins` gains `added_by`. First admin
  still provisioned out-of-band.
- [Deletion-action parity — cancel scheduled deletion](./issues/03-cancel-deletion-parity.md):
  Admin gets a "cancel scheduled deletion" action, mirroring the existing
  `app.cancel_account_deletion` function the self-serve flow already uses.
- [Notify the Engineer when an admin schedules or cancels their deletion](./issues/04-notify-engineer-on-admin-deletion-action.md):
  Email sent on both admin-triggered schedule and cancel, with new copy
  (EN+SW) that names support as the actor rather than reusing the self-serve
  template.
- [Audit log of Platform Admin actions](./issues/05-admin-audit-log.md):
  New `admin_audit_log` table (actor, action, target, timestamp), written by
  every admin mutation, visible only on a new admin-only `/admin/activity`
  view, retained indefinitely.

## Not yet specified

Carried forward unchanged from `.scratch/platform-admin/map.md` — none of
this rebuild's tickets touched them, and the destination still doesn't
require them:

- **Impersonation** — a Platform Admin seeing/acting inside an Engineer's
  actual Project/financial data. Still its own privacy/security-shaped
  decision if ever pursued.
- **Extra sign-in hardening** (MFA, IP allowlisting, shorter session
  lifetime) — explicitly re-deferred by ticket 01; revisit if the admin
  surface or admin count grows.
- **`/admin` visual/UI design** — still not a `prototype` ticket; the new
  `/admin/login`, `/admin/admins`, `/admin/activity` screens are
  straightforward enough that whoever builds them can call it, same as v1.
- **Operational visibility** (errors, background-job/health status) and
  **global config/content management** — both still explicitly out of "what
  admin can access and change" as scoped here; either could become a fresh
  map later.

## Out of scope

Nothing newly ruled out — this rebuild's tickets all sit inside the
destination (entry point + expanded access/change surface); nothing
surfaced during charting that sat beyond it.

## Status

**All 5 tickets (01–05) resolved.** Cross-checked: ticket 02's `added_by`
column and ticket 05's `admin_audit_log` both reference the same action set
(schedule/cancel deletion, add/remove admin) with no gaps; ticket 04's
notification hooks into the same two actions ticket 03 and v1's ticket 03
already wire. The destination — a full specification for the rebuilt
entry point, session model, and expanded capability set — is specified and
build-ready. Written to `.scratch/admin-portal/spec.md`.
