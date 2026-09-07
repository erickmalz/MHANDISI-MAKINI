# Auth implementation approach

Type: grilling
Status: resolved
Blocked by: 05

## Question

The method is fixed (email + password, with reset). Decide **how** it is built,
using ticket 04's findings and the store chosen in ticket 05.

The account-lifecycle ticket (02) has fixed the **product** parameters this
implementation must meet — treat these as given, not open:

- 7-day sliding session, no "remember me", no absolute cap; a revocable
  per-device session list ("sign out everywhere"); reset and deliberate password
  change both revoke all other sessions.
- Password rules: min 10 chars, no composition rules, top-~1,000 common-password
  block.
- Abuse controls: escalating throttle per account + IP on failed logins (no
  permanent lockout), per-IP hourly caps on signup / reset / resend, ~60s
  per-address resend cooldown; generic "email or password is incorrect".
- The five transactional emails and their token lifetimes (verify 24h, reset 1h
  single-use), and no-enumeration on reset.

Still to decide here:

- **Build vs. library vs. delegated**: hand-rolled against the chosen store; an
  auth library (Auth.js, better-auth, …); or the store's own auth
  (e.g. Supabase Auth) if ticket 05 lands there. Note the fixed parameters above
  lean toward DB-backed sessions (the per-device list) over a stateless JWT.
- **Session mechanism**: cookie-wrapped opaque session id vs. JWT, and how the
  check behaves across Next.js 16 server components, route handlers, and proxy.
- **The account id**: auth must yield a stable id that becomes the account key
  on every row (ticket 06). Confirm the chosen approach gives one that never
  changes for the life of the Account.
- **Password storage**: hashing (argon2/bcrypt) — self-managed or handled by the
  library/store.
- **Reset + verification email delivery**: which transactional email path
  (Resend, Postmark, SES, the store's built-in), given East African
  deliverability.

**Constraint from ticket 05 (data-store category):** the store is **self-hosted
standard PostgreSQL with Drizzle, no BaaS**, and the app is one long-running
container (not serverless). So the store's-own-auth option (Supabase Auth) is
**off the table**. The choice narrows to hand-rolled vs. an auth library that
keeps users + sessions in that same Postgres — better-auth is ticket 04's lead
for first-class email/password + reset + verification + DB-backed sessions
self-hosted in your database, which also matches ticket 02's per-device session
list. Auth.js Credentials remains a poor fit (it forces stateless JWT sessions).
Whatever is chosen must mint (or wrap) a stable account id that never changes.

Resolve by naming the approach, the session mechanism, and the email path.

## Answer

### Approach: better-auth, self-hosted in the app's Postgres

- **better-auth**, not hand-rolled and not delegated. Email/password, password
  reset, and email verification are first-class built-ins; the DB-backed
  `session` table with per-row `ipAddress` / `userAgent` gives ticket 02's
  revocable per-device list and instant "sign out everywhere" for free, instead
  of rebuilding all of it. Has a Drizzle adapter, so it fits ticket 05.
- **Rejected — hand-rolled** (Next `authentication.md` / Lucia reference
  pattern): zero dependency risk and total control, but re-implements reset
  tokens, verification, throttle, and session revocation, which Next's own docs
  warn "quickly becomes complex." The dependency risk of better-auth is accepted
  and mitigated by its schema being plain, SQL-visible tables.
- **Rejected — delegated (WorkOS AuthKit / Clerk):** identity homed at a US
  vendor conflicts with ticket 05's portability rule and adds a cross-border
  processor to disclose under ticket 03; the vendors' JWT access/refresh model
  does not map cleanly onto ticket 02's per-device revocable list.
- **Portability check:** better-auth's tables live in *our* Postgres and move
  with `pg_dump`. Ticket 05's "no vendor auth tables" rule was about
  vendor-managed schemas (Supabase's `auth.*`), not this.
- **Table naming (domain-model fix):** better-auth's default table names include
  `user`, `session`, and `account`. `account` collides with the domain
  **Account**. All better-auth tables are prefixed **`auth_`** (`auth_user`,
  `auth_session`, `auth_account`, `auth_verification`, `auth_rate_limit`) so
  "account" in the schema always means the domain concept.
- **Migrations:** better-auth's schema is generated into the Drizzle schema
  files and **`drizzle-kit` owns every migration** — one migration story, per
  ticket 05. better-auth does not run its own migrator against the DB.

### Session mechanism: opaque DB-backed session id, optimistic proxy, authoritative DAL

- **Opaque session id in an `HttpOnly` cookie, backed by `auth_session`**
  (better-auth default). 7-day sliding expiry to match ticket 02. **Not a
  stateless JWT** — a JWT cannot do the per-device list or instant global
  revoke.
- **60-second signed cookie cache** so the hot path skips the DB on most
  requests. Revocation is immediate in the DB; another device stays live for at
  most 60 s after "sign out everywhere" — accepted. (The co-located DB from
  ticket 05 makes dropping the cache to 0 cheap later if strict immediacy is
  ever wanted.)
- **Next.js 16 wiring:**
  - `proxy.ts` — **optimistic cookie-presence check only**, no DB call, per
    Next's guidance that proxy stays optimistic.
  - A `server-only` **DAL helper** wrapped in React `cache()` does the
    authoritative `getSession()` check; **every** server component, route
    handler, and server action calls it. This is the same single funnel
    ticket 06 builds its enforcement on.
- **Password-rule enforcement** (min 10 chars, top-~1,000 breached-list block
  from ticket 02) is a Zod schema in front of better-auth's signup/reset calls.

### The account id: a minted `account_id`, 1:1 with the auth user

- **We mint our own `account_id` (UUIDv7)**, created in the **same transaction**
  as the `auth_user` row at signup. It is 1:1 with `auth_user.id` and never
  changes for the life of the Account.
- Every account-scoped domain row keys off `account_id`. **Nothing in the domain
  schema references `auth_user.id` directly.** This is the stable key ticket 06
  feeds into Postgres RLS, and it survives an auth-layer swap.
- An **`account` table** holds `id` (= `account_id`), `auth_user_id` (FK), and
  the Engineer profile fields from ticket 02 (full name, phone). Email lives on
  `auth_user` (better-auth owns it, incl. the verification and email-change
  flows).

### Password hashing: better-auth, configured to argon2id

- better-auth performs the hashing, **configured to argon2id** via
  `@node-rs/argon2` (already in Next's `serverExternalPackages` allow-list),
  overriding better-auth's scrypt default — argon2id is the current OWASP first
  choice and it is a one-block config change.

### Email path: Resend, with Postmark as the named fallback

- **Resend** on the free tier (3,000/mo, far above this app's volume), sending
  from a **dedicated verified subdomain with full SPF / DKIM / DMARC** — proper
  domain auth is what drives deliverability to the Gmail / Outlook / Yahoo
  inboxes most Tanzanian users have, more than the provider choice does.
- **Postmark** is the named drop-in fallback if Resend's delivery rate
  disappoints (strongest transactional-deliverability reputation of the
  affordable options).
- The email provider is a (minor) cross-border processor — **disclose in the
  privacy policy** per ticket 03.
- The five email types and token lifetimes are already fixed by ticket 02
  (verify 24 h, reset 1 h single-use, no-enumeration); this ticket only picks
  the transport.

### Abuse-control counters: better-auth rate limiter, DB-backed

- Ticket 02 fixed the policy. Storage: **better-auth's built-in rate limiter
  with database-backed storage** (`auth_rate_limit` table), not its in-memory
  default — survives container restarts and holds if the one container from
  ticket 05 ever runs 2 replicas. **No Redis for v1.**
- The escalating failed-login throttle keys on `(account, IP)` and clears on a
  successful login.

### Handoff to ticket 06

Ticket 07 provides: the authenticated `account_id` is available from the
`server-only` DAL session helper on every request. Ticket 06 owns **binding that
id into the query context** (transaction-scoped `SET LOCAL`, the non-owner role,
`FORCE ROW LEVEL SECURITY`) and the orthogonal id-exposure / 404-vs-403
questions.

### Fast-follow (not decided here)

- The exact better-auth version pin against the installed `next@16.x`.
- Email template copy and the Swahili/English split (design-system concern).
- Whether the 60 s cookie-cache window is tightened after real use.
