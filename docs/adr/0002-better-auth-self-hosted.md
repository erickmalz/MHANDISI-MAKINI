---
status: accepted
---

# better-auth, self-hosted in the app's own Postgres, with opaque database sessions

## Context and decision

The multi-tenant app needs open self-serve **email + password** auth with
password reset (see `.scratch/multi-tenancy/map.md`). The "Account lifecycle"
ticket fixed the product parameters — a 7-day sliding session, a revocable
per-device session list with "sign out everywhere", reset and deliberate
password change revoking all other sessions, specific abuse controls, and five
transactional emails with fixed token lifetimes. The "Data store" ticket /
ADR 0001 fixed a self-hosted standard Postgres with Drizzle on one long-running
container, with Postgres RLS mandatory.

Resolving the "Auth implementation approach" ticket, we decided:

- **The auth layer is [better-auth](https://www.better-auth.com), self-hosted
  in the same Postgres.** Not hand-rolled, not a hosted identity provider.
- **Its tables are prefixed `auth_`** (`auth_user`, `auth_session`,
  `auth_account`, `auth_verification`, `auth_rate_limit`) so `account`
  everywhere in the schema means the domain **Account**, never better-auth's
  OAuth-credential table. **`drizzle-kit` owns every migration**; better-auth's
  generated schema is folded into the Drizzle schema files.
- **Sessions are an opaque session id in an `HttpOnly` cookie, backed by the
  `auth_session` table**, 7-day sliding, with a **60-second signed cookie
  cache** to keep the hot path off the database. Not a JWT.
- **`proxy.ts` does an optimistic cookie-presence check only.** A `server-only`
  data-access-layer helper wrapped in React `cache()` does the authoritative
  `getSession()` check and is called by every server component, route handler,
  and server action — the same single funnel the "Tenant-scoping enforcement"
  ticket builds RLS binding on.
- **A minted `account_id` (UUIDv7), created in the same transaction as the
  `auth_user` row at signup**, is the stable tenant key. Every domain row keys
  off `account_id`; nothing in the domain schema references `auth_user.id`.
- **Password hashing is argon2id** via `@node-rs/argon2` (better-auth performs
  it, overriding its scrypt default).
- **Transactional email goes through Resend** (domain-authed subdomain,
  SPF/DKIM/DMARC), with **Postmark** as the named fallback.
- **Abuse-control counters use better-auth's rate limiter with database-backed
  storage** (`auth_rate_limit`), no Redis.

## Why (the trade-off)

The obvious path for a Next.js app is Auth.js / NextAuth. We rejected it and the
other options for specific reasons:

- **Auth.js `Credentials` provider forces stateless JWT sessions** and does not
  support a database-session adapter. The "Account lifecycle" ticket requires a
  revocable per-device session list and instant "sign out everywhere", which a
  stateless JWT cannot provide without re-implementing session persistence by
  hand. better-auth's `auth_session` table gives that directly, with per-row
  `ipAddress` / `userAgent`.
- **Hand-rolling** (per Next's `authentication.md` or the now-deprecated Lucia's
  reference pattern) means building and maintaining reset tokens, email
  verification, throttling, session revocation, and "log out everywhere" — work
  Next's own docs warn "quickly becomes complex", for a solo maintainer.
- **Hosted identity (WorkOS AuthKit, Clerk)** homes the user record — email,
  password hash, profile — at a US vendor. That conflicts with ADR 0001's
  portability rule, adds a cross-border data processor to disclose under the
  data-protection stance, and the vendors' JWT access/refresh model does not map
  cleanly onto the required per-device revocable list.
- **The store's own auth (Supabase Auth)** was already ruled out by ADR 0001.

better-auth's cost is a **dependency on a young library**. It is mitigated by
its schema being plain, SQL-visible tables in our own database (migration off it
is an ORM-level exercise, not a credential re-homing) and by `drizzle-kit`, not
better-auth, owning the migration history.

## Consequences

- **The auth layer is a real dependency to track** — version pinning against the
  installed `next@16.x` is part of upgrades, and a future better-auth breaking
  change is our problem to absorb.
- **`account` in the schema is reserved for the domain concept.** Any
  better-auth table or column that would be called `account` is prefixed
  `auth_`.
- **A device stays authenticated for up to 60 seconds after "sign out
  everywhere"**, bounded by the cookie-cache TTL. Revocation is immediate in the
  database. The co-located database from ADR 0001 makes dropping the cache to
  zero cheap if strict immediacy is later required.
- **Email deliverability to East African inboxes depends on domain
  authentication** (SPF/DKIM/DMARC on a dedicated subdomain), not on the
  provider. Resend and Postmark are interchangeable at this app's volume.
- **The email provider is a cross-border processor** disclosed in the Privacy
  Policy alongside the database host.
- **The `account_id` is ours.** Swapping the auth layer later changes how
  `auth_user` is populated, not the tenant key on every domain row.
