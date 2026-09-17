# Platform Admin data model & provisioning

Type: grilling
Status: resolved

## Question

Where does "is this auth_user a Platform Admin" get represented, and how
does someone actually become one — self-serve, or only out-of-band? Does
the design need to support more than one Platform Admin?

## Answer

**A separate `platform_admins` table, keyed by `auth_user.id`** — not a
boolean bolted onto better-auth's own `auth_user` table. This mirrors the
existing `accounts` precedent (its own table, 1:1 with `auth_user`, nothing
added to the auth schema itself) and keeps ADR 0002's boundary intact: the
`auth_` prefix is reserved strictly for better-auth's own tables, and
`platform_admins` is a domain table like `accounts`, not an auth concern.

**No self-serve path exists or is planned.** There is no admin sign-up form
and no invite flow. The first Platform Admin row is created directly
against the database, against the operator's own existing `auth_user` row,
out-of-band (a manual SQL insert or a one-off script run by hand).

**The table supports more than one row in principle** (it's a table, not a
single hardcoded email or env var), but no admin-management UI is built
now. Adding a second Platform Admin is the same manual, out-of-band
operation as the first — there's no product surface for a Platform Admin
to invite or manage another one.

### Consequences for the spec

- New table: `platform_admins` (at minimum `auth_user_id` referencing
  `auth_user.id`, `created_at`). No RLS needed in the tenant sense — it
  isn't Account-scoped data, but access to it is still gated by ticket 02's
  session check, not by Postgres RLS the way `accounts`-owned tables are.
- No signup/invite screens, no self-management UI, no "list of admins"
  page — all out of scope for this map unless a future need reopens it.
