# Platform Admin — Decision Map

Wayfinder decision map. Tracker: local markdown (`.scratch/platform-admin/`).
Started 2026-09-17.

## Destination

Add a **Platform Admin** capability: a person who runs the service (not an
Engineer, owns no Account) signs in through the existing sign-in page and,
because their `auth_user` is flagged as a Platform Admin, lands on an admin
page instead of Choose Project. That page's first job is **Account/tenant
management** — list Accounts and act on them for support/ops. Reaching the
destination means every decision needed to build that (the flag/table shape,
redirect logic, what "act on" covers, what's visible about an Account) is
locked. **This map produces decisions, not code** — same discipline as
`.scratch/phase1-decisions/`, `.scratch/multi-tenancy/`,
`.scratch/operational-control/`, and `.scratch/phase3/`/`.scratch/phase4/`.

## Notes

- **New ground**: no admin/role concept existed anywhere before this map —
  no `role` column, no admin table, no admin routes. `CONTEXT.md`
  ("Identity and tenancy") previously defined only Engineer and Account;
  this map adds the **Platform Admin** term there directly (glossary
  settling is vocabulary work, not build work, so it's done as part of
  charting, not deferred to a ticket).
- **Build state this map is written against**: `web/` Phases 1–4 are built.
  Auth is better-auth, self-hosted (ADR 0002) — email+password, opaque
  `HttpOnly`-cookie sessions, a single authoritative `getSession()`-backed
  `server-only` DAL helper wrapped in `React.cache()` that every server
  component/route handler/server action funnels through, with `proxy.ts`
  doing only an optimistic cookie-presence check. `accounts`
  (`web/src/lib/data/schema/accounts.ts`) is its own table, 1:1 with
  `auth_user`, keyed by a minted `account_id` — nothing in the domain
  schema references `auth_user.id` directly except `accounts` itself. The
  sign-in page (`web/src/app/sign-in/page.tsx`) is a plain email/password
  form that today always redirects to `/` (Choose Project) on success.
- **Decision-maker**: the user answers every ticket personally — resolved
  in this session by running the `grilling` design-tree method (first to
  name the destination, then breadth-first across the frontier) and
  **taking the firm recommendation on each round as the decision**, per the
  user's explicit instruction and standing preference on this kind of
  ticket (see the memory `mhandisi-makini-grilling-accept-recommendations`).
  All three tickets below were resolved live during charting, across two
  grilling rounds, rather than deferred to separate per-ticket sessions —
  same precedent as `.scratch/phase4/map.md`.
- **Every ticket is `grilling`.**
- **This map plans, it does not build.** The `platform_admins` DDL, the
  sign-in redirect branch, the DAL session-check extension, and the
  `/admin` screens are a downstream build effort, tracked the way
  `phase2/status.md` through `phase4/status.md` track their slices — a
  `.scratch/platform-admin/status.md` follows once building starts.

## Tickets

1. [Platform Admin data model & provisioning](./issues/01-platform-admin-data-model-and-provisioning.md)
2. [Admin route access, redirect & unauthorized handling](./issues/02-admin-route-access-and-redirect.md)
3. [Admin page v1 scope: Account list/detail & data-visibility boundary](./issues/03-admin-page-v1-scope-and-data-visibility.md)

## Decisions so far

- [Platform Admin data model & provisioning](./issues/01-platform-admin-data-model-and-provisioning.md):
  New `platform_admins` table keyed by `auth_user.id` (mirrors the
  `accounts` precedent; keeps the `auth_` prefix reserved for better-auth
  per ADR 0002). No self-serve admin sign-up or invite flow — every row is
  created out-of-band, by hand, against an existing `auth_user`. The table
  supports more than one row, but no admin-management UI is built.
- [Admin route access, redirect & unauthorized handling](./issues/02-admin-route-access-and-redirect.md):
  No separate admin auth flow — the existing sign-in form checks
  `platform_admins` after a successful `signIn.email` and redirects to
  `/admin` instead of `/`. `/admin` is protected by the same authoritative
  `getSession()` DAL helper every other route already uses, extended to
  check the flag. A non-admin (or signed-out visitor) hitting `/admin`
  directly is redirected to `/`, no distinct 403/404 — same
  no-enumeration instinct as the sign-in form's generic error.
- [Admin page v1 scope: Account list/detail & data-visibility boundary](./issues/03-admin-page-v1-scope-and-data-visibility.md):
  Read-only Account list + detail (Engineer name/phone, linked email,
  created date, live project count, Terms-acceptance, deletion-scheduled
  status), plus triggering the *existing* self-serve
  deletion-scheduling — no new mutation path. No hard delete, no direct
  editing of an Engineer's data, no impersonation. The Platform Admin
  never sees Project/financial domain data, only Account-level metadata.

## Not yet specified

- **Impersonation** — letting a Platform Admin see or act inside an
  Engineer's actual Account data (Projects, financials, documents) for
  support. Explicitly deferred out of v1 by ticket 03's data-visibility
  boundary; would need its own privacy/security-shaped decision if ever
  pursued.
- **Audit logging of Platform Admin actions** (e.g. who scheduled which
  Account's deletion, and when) — not decided; the app has no general
  audit-log mechanism today (Phase 4 ticket 05 explicitly declined one for
  Engineer-facing activity).
- **Notifying the Engineer** when a Platform Admin (rather than the
  Engineer themselves) schedules their Account's deletion — today's
  self-serve flow's "cancel by signing in" mechanic doesn't distinguish
  who scheduled it; whether it should is open.
- **Extra hardening on the admin sign-in path** (MFA, IP allowlisting,
  shorter session lifetime) beyond reusing the standard session check —
  not raised as a requirement yet; revisit if the admin surface grows
  beyond read-only + one reused mutation.
- **`/admin` visual/UI design** — not yet a `prototype` ticket; the v1
  scope (ticket 03) is simple enough it may not need one, but that's a
  call for whoever builds it.
- **Operational visibility** (errors, background-job/health status) and
  **global config/content management** (e.g. cross-Account stage-template
  defaults) — both raised while naming the destination as plausible future
  meanings of "administrator," both explicitly deferred: the destination is
  Account/tenant management only. Either could become a fresh map later if
  a real need surfaces.

## Out of scope

Nothing ruled out yet — every open thread above is fog still headed toward
the destination, not work beyond it.

## Status

**All 3 tickets (01–03) resolved**, cross-checked against each other (02's
redirect depends on 01's `platform_admins` table; 03's admin-only query
scope depends on 02's access-control boundary — no contradictions found).
The destination — a v1 Platform Admin capability reached through the
existing sign-in page, doing read-only Account list/detail plus reusing
the existing deletion-scheduling action, with no visibility into an
Engineer's domain data — is fully specified and build-ready. The `Not yet
specified` items (impersonation, audit logging, notifications, admin-page
visual design, operational visibility, global config) are real but
explicitly out of v1; none blocks starting the build. A
`.scratch/platform-admin/status.md` follows once building starts, same
split as every prior map.
