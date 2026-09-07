# Tenant-scoping enforcement: making cross-account access impossible

Type: grilling
Status: resolved
Blocked by: 05

## Question

This is the security-critical decision that follows from "shared database +
account key." One Engineer must **never** read or write another Engineer's
rows — not through a bug, a missing `where` clause, a crafted request, or an id
guessed from a URL (`/projects/[id]` today takes a bare id).

Decide:

- **Enforcement layer**: database row-level security (Postgres RLS, keyed off
  the session's account id); a single data-access module that every read and
  write must go through and that always injects the account filter; an ORM
  global scope / middleware; or defence in depth across more than one of these.
- **Where the current account id comes from** on each request, and how it is
  bound to the query context (server component, route handler, background job).
- **Id exposure**: do record ids stay sequential/guessable (with enforcement
  making guessing harmless) or become non-enumerable (UUID/nanoid)? The app
  currently routes on human-readable slugs like `mbezi-beach-residence`.
- **The failure mode**: what happens when a request references a record from
  another Account — 404 (don't reveal existence) vs 403.
- **How it is tested**: the check that proves isolation holds.

**Constraint from ticket 05 (data-store category):** the enforcement *requirement*
is already fixed — **database-enforced isolation via Postgres RLS is mandatory**,
as a backstop beneath a single `server-only` data-access layer (defence in depth,
not either/or). The store is standard co-located PostgreSQL with **Drizzle**, the
app is one long-running container. So this ticket no longer chooses *whether* to
use RLS; it designs the *mechanism*: the non-owner role + `FORCE ROW LEVEL
SECURITY` setup, where the current account id comes from on each request and how
it is bound to the query (Drizzle transaction wrapper + `SET LOCAL`), the DAL
shape, plus the still-open id-exposure (slugs vs UUIDs) and 404-vs-403 questions
and the isolation test.

Resolve by fixing the enforcement mechanism and the id/failure-mode rules.

## Answer

The enforcement design. Ticket 05 / [ADR 0001](../../../docs/adr/0001-postgres-rls-on-a-long-running-container.md)
already fixed the *frame* — Postgres RLS as a hard backstop **beneath** a single
`server-only` data-access layer (defence in depth), on standard co-located
PostgreSQL 15+ with Drizzle, one long-running container, app connecting as a
non-owner role. This ticket fixes the mechanism, the id rules, and the test.

### The tenant key

- **A dedicated `accounts` table with its own generated id (UUID v7), 1:1 with
  the auth user** via `accounts.user_id` → `auth_user.id`. Every domain row
  carries **`account_id`** — nothing references `auth_user.id` (matches the
  auth-implementation decision). Rationale: `CONTEXT.md` already defines
  Account as its own concept distinct from Engineer; the row key then never
  depends on the auth library's id format, so auth can be swapped without
  touching a single `account_id`; and `accounts` is where the account-level
  lifecycle state from
  [the account-lifecycle decision](./02-account-lifecycle.md) lives
  (email-verified flag, scheduled-for-deletion + grace date, accepted-terms
  version/timestamp) without polluting the auth tables or every domain table.
- The exact column set on `accounts` is a build concern, informed by ticket 02.

### Row coverage

- **Every domain table carries its own `NOT NULL account_id` column**,
  denormalised all the way down (Task, PO line, Delivery line, …) — not "only
  Project, join upward." Postgres RLS evaluates a per-table predicate and does
  **not** re-check through foreign keys (FK verification bypasses RLS), so a
  table without its own key is a table RLS cannot guard. Identical columns also
  make every policy byte-for-byte identical, which is what the CI conformance
  lint (below) checks.
- `accounts`, and better-auth's `auth_*` tables (`auth_user`, `auth_session`,
  `auth_rate_limit`, …), are **not** GUC-scoped — auth must resolve a user by
  email before any session exists. `accounts` carries its own RLS policy
  `USING (id = current_setting('app.current_account_id')::uuid)` so `app_runtime`
  only ever sees its own account row; the `auth_*` tables are protected by only
  ever being touched by the auth module.

### Enforcement mechanism

Transaction-local custom setting, not per-tenant Postgres roles (thousands of
roles + DDL on signup + a fight with pooling is a non-starter):

- App connects as one non-owner, non-superuser role **`app_runtime`**;
  migrations run as the **owner** role.
- Every domain table: `ENABLE ROW LEVEL SECURITY` **and**
  `FORCE ROW LEVEL SECURITY` (binds even for the table owner — no god path).
- Every policy, identical:
  `USING (account_id = current_setting('app.current_account_id')::uuid)`
  `WITH CHECK (account_id = current_setting('app.current_account_id')::uuid)`.
- `current_setting('app.current_account_id', true)` returns NULL when unset →
  policy matches nothing → **fails closed**. A DAL path that forgot to set the
  var sees an empty database, not everyone's data.
- The `SET LOCAL app.current_account_id = <id>` is statement 1 of a Drizzle
  transaction wrapper; **every** DAL read and write runs inside that wrapper.
  `SET LOCAL` is transaction-scoped, so a pooled connection resets on commit.
- RLS does not cover `TRUNCATE` — only migrations truncate, never the DAL.

### Binding the account id to the request

- **One `server-only` resolver `getCurrentAccountId()`, wrapped in React
  `cache()`**: composes on the authoritative `server-only` session check from
  [the auth-implementation decision](./07-auth-implementation-approach.md) →
  resolves `accounts.id` from the session's `auth_user` → returns it or throws
  `NotAuthenticated`.
- Every DAL function runs its query through a `withAccount(fn)` wrapper that
  calls the resolver, opens a transaction, issues the `SET LOCAL`, runs `fn`.
- **The account id is never a DAL parameter** and never comes from a route param
  or form field — only from the session via the cached resolver. "Pass the
  wrong account id" is unrepresentable.
- Server Components, Server Actions, and Route Handlers all call the same DAL
  functions and never touch the transaction, the `SET LOCAL`, or the id. Each is
  an independent entry point that re-verifies through the DAL.
- `proxy.ts` does the optimistic cookie check only — never sets the var, never
  the last line of defence (matches Next 16's own guidance from
  [`research/04-findings.md`](../research/04-findings.md) §1.3).
- Each DAL call gets its own short transaction; batching hot paths is
  [ticket 08](./08-mock-data-cutover.md)'s concern.

### Session-less jobs (deletion sweep, dormancy mail, unverified-pause)

- A dedicated **`maintenance`** role with `BYPASSRLS`, credentials held only by
  the scheduled-job process (separate from the app-runtime creds), every action
  logged.
- Its only privileged move is querying `accounts` for candidates (due for
  deletion, dormant 6 months, unverified past 7 days).
- The **30-day deletion sweep** then loops the due accounts and, **per account,
  sets `app.current_account_id` and issues the `DELETE`s** — RLS scopes every
  delete automatically; there is no blind `DELETE FROM <table>` that could span
  accounts. The job enumerates domain tables from the same central list the CI
  lint checks.
- Dormancy / unverified jobs only flip flags on the `accounts` row; they never
  touch domain tables.

### Id exposure and failure mode

- **Opaque, non-enumerable ids in URLs** (UUID / nanoid); the current human
  slugs (`/projects/mbezi-beach-residence`) are dropped from routing. A record
  may keep a display slug/title, but the route param is the opaque id. Slugs
  leak the existence and names of another Engineer's projects and force ugly
  per-account collision handling; opaque id + RLS means a policy bug is still not
  walkable by incrementing an int or guessing a name — the cheap belt to RLS's
  braces.
- **A cross-account reference is always a 404** (Next's `notFound()`), never
  403 — RLS makes the row simply invisible, so the DAL treats "no row" as 404
  uniformly. 403 is reserved for "not signed in / session ended"
  (ticket 02's flow).
- This partially informs the map's *project picker / "current project"* fog
  (URLs use opaque ids, cross-account is 404) but does not settle where
  "current project" is held — that stays with ticket 08.

### Keeping denormalised `account_id` honest

- **Composite foreign keys.** Each parent gets `UNIQUE (id, account_id)`; each
  child FK is `(parent_id, account_id) REFERENCES parent (id, account_id)`. The
  database then guarantees a child's `account_id` equals its parent's.
- `account_id` is set once at insert from the resolver and **never exposed as
  writable** in the DAL — so it cannot drift.

### The isolation test (all in CI, against a real Postgres, blocking on merge)

RLS does not exist in a mock or in SQLite — the suite runs against a real
PostgreSQL (Testcontainers or a CI Postgres service).

1. **Two-account integration test — the core proof.** Seed accounts A and B,
   each a full object graph (project → stage → task → PO → delivery → payment;
   fee invoice, funding request, deposit, supplier, subcontractor, petty cash,
   variation). Signed in as A: every DAL read against B's ids returns empty →
   404; every DAL mutation targeting B's rows is a no-op / throws; A's own graph
   is fully reachable (catches false negatives).
2. **Raw-connection RLS test.** As `app_runtime`, bypassing the DAL:
   `SET app.current_account_id` to A → every domain table returns only A's rows;
   a random uuid → zero rows; unset → zero rows (fails closed);
   `UPDATE … SET account_id = <B>` → blocked by `WITH CHECK`.
3. **Role capability test.** `app_runtime` is not superuser, lacks `BYPASSRLS`,
   owns no domain table; every domain table has `relrowsecurity` *and*
   `relforcerowsecurity`.
4. **Schema-conformance lint — runs on every migration, fails the build.** Via
   `pg_class` / `pg_policy` / `information_schema`: every domain table has RLS
   enabled + forced and exactly the standard policy; a `NOT NULL account_id`;
   every FK into a parent includes `account_id`. This is the guard against a new
   table slipping through without the full treatment.
5. **Composite-FK test.** Raw insert of a child row with an `account_id`
   mismatched from its parent → FK violation.
6. **Route-level test.** `GET /projects/<B's id>` as A → 404 (not 403, not a
   redirect); a Server Action invoked by direct POST with B's id → same.

### Handoffs

- **[Auth implementation approach](./07-auth-implementation-approach.md)**
  (resolved in parallel, consistent with this): better-auth, opaque DB-backed
  session id, minted `account_id` UUIDv7 1:1 with `auth_user`, a `server-only`
  DAL session check as the single funnel. `getCurrentAccountId()` composes on top
  of that session check.
- **[Mock-data cutover](./08-mock-data-cutover.md)**: inherits the DAL contract
  fixed here — the `withAccount` wrapper, the `cache()`d resolver, no
  `account_id` parameters, opaque record ids, 404-on-missing. Ticket 08 owns the
  function inventory, where finance figures are computed, and batching.
