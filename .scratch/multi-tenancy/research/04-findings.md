# Findings: persistence + auth options for the `web/` Next.js 16 app

Research ticket: `.scratch/multi-tenancy/issues/04-nextjs-persistence-and-auth-options.md`
Date: 2026-09-07. Feeds decision tickets 05 (data-store category), 06 (tenant
enforcement), 07 (auth approach). **This is an options-and-trade-offs survey, not
a recommendation.**

---

## 0. What `web/` actually is today

- `web/package.json`: `next 16.3.4`, `react` / `react-dom` `19.2.8`, Tailwind v4,
  TypeScript 5, ESLint 9. **No database, ORM, auth, or backend dependency of any
  kind.** Scripts are the plain `next dev` / `next build` / `next start`
  (Turbopack is the default in 16, so no `--turbopack` flag).
- App Router under `web/src/app`; data is hardcoded in
  `web/src/lib/{mock-data,funding-mock,procurement-mock}.ts` and consumed
  synchronously. `web/src/lib/finance.ts` holds the Phase 1 formulas;
  `web/src/lib/types.ts` the domain types. Routing is on human slugs today
  (`/projects/mbezi-beach-residence`).
- `web/AGENTS.md` carries the Next.js "this is NOT the Next.js you know" block and
  points at the version-matched docs bundled in
  `web/node_modules/next/dist/docs/`. Everything in Section 1 below is from those
  bundled docs.

---

## 1. Next.js 16 constraints that shape every option

Source: `web/node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
and the referenced API pages, all bundled with `next@16.3.4`.

### 1.1 `middleware` is now `proxy`, and it is **Node.js-only**

- The `middleware` file convention is deprecated and renamed to `proxy`
  (`proxy.ts` at the same level as `app/`).
  (`.../03-api-reference/03-file-conventions/proxy.md`, version history: "`v16.0.0`
  Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js
  runtime".)
- **"The `edge` runtime is NOT supported in `proxy`. The `proxy` runtime is
  `nodejs`, and it cannot be configured."** Setting `runtime` in a proxy file
  throws. (version-16.md, "`middleware` to `proxy`".)
- Separately, the **Edge Runtime as a whole is deprecated** in 16: the `runtime`
  route-segment option documents `'edge'` as deprecated and says "Remove the
  `runtime` export from your route files."
  (`.../03-file-conventions/02-route-segment-config/runtime.md`.)

Consequence for this survey: the historical selling point of several auth stacks —
"works in Edge middleware without a DB call" — is now **moot**. Proxy runs in
Node, so it can do a real session lookup if you want; but Next's own guidance
(below) is still to keep proxy checks optimistic and enforce at the data layer.

### 1.2 Async request APIs

`cookies()`, `headers()`, `draftMode()`, and `params` / `searchParams` are
**async only** in 16 (the synchronous 15-era compatibility is removed). Any
auth/session helper reads them with `await`. (version-16.md, "Async Request
APIs".)

### 1.3 Next's recommended security architecture (unchanged in shape, reinforced)

Sources: `.../02-guides/authentication.md`, `.../02-guides/data-security.md`.

- **Data Access Layer (DAL)** is the recommended pattern for new projects: a
  `server-only` module that every read/write funnels through, does the
  authN/authZ check, and returns minimal DTOs. React `cache()` memoises the
  session read within a render pass.
- **Proxy is for optimistic checks only** ("read the session from the cookie …
  avoid database checks"). "While Proxy can be useful for initial checks, it
  should not be your only line of defense." Server Actions and Route Handlers are
  **independent entry points** — each must re-verify session + ownership
  (IDOR/authorization, not just authentication). data-security.md spells out the
  ownership check (`post.authorId !== session.user.id → Forbidden`).
- Server Actions are reachable by direct POST regardless of UI; encrypted action
  IDs + dead-code elimination help but "you should still treat Server Actions as
  reachable via direct POST requests and verify authentication and authorization
  inside each one."
- Recommended session libs named by Next: **iron-session** and **Jose** (for
  hand-rolled stateless cookies).
- `serverExternalPackages` auto-covers the DB/auth-relevant native packages:
  `pg`, `@prisma/client`, `prisma`, `better-sqlite3`, `libsql` / `@libsql/client`,
  `mongodb`, `bcrypt`, `@node-rs/bcrypt`, `@node-rs/argon2`, `argon2`, `oslo`,
  `@mikro-orm/*`, `@zenstackhq/runtime`.
  (`.../05-config/01-next-config-js/serverExternalPackages.md`.)

### 1.4 Cache Components (opt-in) changes how you read a session

Source: `.../02-guides/authentication-with-cache-components.md`,
`.../02-guides/upgrading/version-16.md` ("Partial Prerendering").

- PPR / `experimental.dynamicIO` / `experimental.useCache` are gone; the opt-in is
  now `cacheComponents: true` in `next.config`.
- **The app does NOT have this enabled** and does not need to. But if 05/07 ever
  turn it on: a session read cannot be prerendered, must sit behind `<Suspense>`,
  and you use `use cache: private` (reads `cookies()`, browser-only) vs plain
  `use cache` (server, keyed by an extracted value like `userId`).
- Also new in 16: `revalidateTag(tag, profile)` now **requires** the second
  cache-life arg; `updateTag(tag)` (Server-Action-only) gives read-your-writes;
  `refresh()` refreshes the client router from an action. Relevant to 08 (mock
  cutover) more than here.

### 1.5 Where a Next 16 app can run

Source: `.../01-getting-started/17-deploying.md`,
`.../03-file-conventions/proxy.md` ("Platform support").

- Deployable as a **plain Node.js server** (`next build && next start`), a
  **Docker container** (`output: "standalone"`), a **static export** (loses
  server features — not an option here), or via a build **Adapter**.
- **Verified adapters: Vercel and Bun.** Cloudflare and Netlify have their own
  (unverified) integrations; DigitalOcean, Fly.io, Railway, Render, Google Cloud
  Run, AWS Amplify, Firebase App Hosting, Deno Deploy all documented.
- Proxy works on Node server and Docker; not on static export; "platform-specific"
  on adapters.
- **Nothing in the persistence/auth survey below requires Vercel.** Vercel is one
  option; a long-running Node/Docker host (Fly.io, Railway, Render, a VPS) is
  equally supported and materially changes the serverless trade-offs (Section 4).
- Node **20.9+** required; React 19.2.

---

## 2. Data-store shapes

The fixed model (from `map.md`): **one shared database, an `account_key` column on
every row, every query scoped to the current Account.** The financial model needs
**transactions**. Product is **free**, run by a **solo maintainer**, **online-required**.

### 2.1 Managed Postgres + a TypeScript ORM / query builder (DB hosted separately)

The database is a managed Postgres instance from some provider; the app talks to
it through a library. The three mainstream libraries:

| Library | Shape | Tenant-scoping story | Notes |
|---|---|---|---|
| **Drizzle** | SQL-first ORM + `drizzle-kit` migrations | **First-class Postgres RLS primitives**: `pgPolicy()`, `pgRole()`, `.existing()`, `.link()`; provider helpers `crudPolicy` + `authenticatedRole`/`authUid()` for Neon, `anonRole`/`authenticatedRole`/`serviceRole` for Supabase. Also trivially supports the "app-layer filter" style because you write the `where`. A `createDrizzle()`-style wrapper sets `set_config('request.jwt.claims', …, TRUE)` / `set local role …` inside a transaction and resets after. ([orm.drizzle.team/docs/rls](https://orm.drizzle.team/docs/rls)) | RLS API is relatively new but documented and used in production for multi-tenant SaaS; some Supabase helpers still "coming in future releases". SQL-first nature makes RLS integration natural. |
| **Prisma** | Schema-DSL ORM, `prisma migrate` | RLS via **Client Extensions**: official example `prisma/prisma-client-extensions/row-level-security` injects `SET LOCAL app.current_tenant` and enforces it with an **interactive transaction** so the `SET LOCAL` and the query share one pooled connection. Third-party `prisma-extension-rls`, `prisma-rls`. App-layer scoping also possible via a query-hook extension that appends `where`. ([prisma.io client-extensions](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)) | Known gotcha: with transaction-mode pooling, `SET LOCAL` only holds for the connection if wrapped in a transaction — Prisma's own example does exactly this. Heavier runtime, its own migration engine. |
| **Kysely** | Type-safe query builder, no ORM runtime | No built-in RLS or global scope. You get raw control: wrap writes/reads in `db.transaction()` and issue `set local` yourself, or centralise the `account_key` filter in a data-access module. Migrations via `kysely` migrator or a separate tool. | Thinnest layer, least magic — fits a "single funnel" DAL well, but the funnel is entirely your discipline. |

Providers in this bucket (Postgres you point an ORM at):

- **Neon** — serverless Postgres, AWS. Regions: **US (Virginia/Ohio/Oregon), EU
  (Frankfurt, London), Asia-Pacific (Singapore, Sydney), South America (São
  Paulo). No Africa / Middle East region.**
  ([neon.com/docs/introduction/regions](https://neon.com/docs/introduction/regions))
  Pooling: PgBouncer **transaction mode** via a `-pooler` host, up to 10,000
  client connections; pooled connections can't do session-level `SET` /
  `LISTEN`/`NOTIFY` / temp tables, but **`SET LOCAL` inside a transaction works**
  (this is the RLS pattern). Direct (non-pooled) connections for migrations.
  ([neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling))
  **Scale-to-zero on the Free plan is mandatory and cannot be disabled**; a
  suspended compute reactivates "within a few hundred milliseconds" on the next
  query. Paid plans can pin it always-on.
  ([neon.com/docs/introduction/scale-to-zero](https://neon.com/docs/introduction/scale-to-zero))
  `@neondatabase/serverless` driver does one-shot queries over HTTP (good for
  serverless/no pooling), or WebSocket for sessions/transactions.
  Neon also ships an "Authorize"/RLS integration and Drizzle `crudPolicy` helpers.
- **Supabase** — see 2.2 (it is Postgres + more).
- **PlanetScale for Postgres** — GA 2025 (alongside its Vitess/MySQL product).
  Runs on **AWS and GCP**; HA cluster across 3 AZs (1 primary + 2 replicas);
  PgBouncer pooling on port 6432 (direct on 5432), plus optional **dedicated
  PgBouncers**. No public free tier — cheapest paid Postgres plan is ~$39/mo
  (PS-10). No Africa region.
  ([planetscale.com/blog/planetscale-for-postgres](https://planetscale.com/blog/planetscale-for-postgres),
  [planetscale.com/docs/postgres/connecting](https://planetscale.com/docs/postgres/connecting))
- **Generic managed Postgres** — AWS RDS/Aurora, Google Cloud SQL, DigitalOcean
  Managed Postgres, Render Postgres, Fly.io Postgres, Railway. These *do* include
  regions on or near Africa if you self-manage the provider: **AWS `af-south-1`
  (Cape Town)** exists; none of the serverless BaaS layers above expose it. A
  generic managed Postgres in `af-south-1` or `eu-*` is the only way to get an
  in-continent or short-hop managed Postgres.

Portability: standard Postgres + a migration tool is the **most portable** option
— the DB can move between any of these providers. RLS policies are plain SQL and
travel with a `pg_dump`.

### 2.2 Backend-as-a-service (DB + auth + more, one vendor)

| BaaS | Engine | Tenant enforcement | Auth included? | Region / East Africa | Portability |
|---|---|---|---|---|---|
| **Supabase** | Postgres (real, full SQL, RLS, extensions) | **RLS is the intended mechanism** and is deeply wired: policies call `auth.uid()` / `auth.jwt()`, the connection's JWT claims are set from the user's access token. PostgREST auto-generates a REST API that RLS guards; `@supabase/ssr` handles the Next cookie flow. You can also bypass all of it with the service-role key + your own `where` filters (server-side only). | **Yes — Supabase Auth**: email/password, email confirmations, magic links, OAuth; issues a **stable UUID** in `auth.users.id`; sessions are **JWT access token (~1h) + refresh token**; `auth.uid()` in RLS reads the JWT `sub`. ([supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)) | **No Africa region.** General regions: US East (N. Virginia), EU (Frankfurt), SE Asia (Singapore), plus ~16 specific AWS regions across US/Canada/EU/APAC/South America. Closest practical: Frankfurt (`eu-central-1`) or Mumbai (`ap-south-1`). South-Africa region requested since 2024, declined on operational grounds. ([supabase.com/docs/guides/platform/regions](https://supabase.com/docs/guides/platform/regions), [github.com/orgs/supabase/discussions/34614](https://github.com/orgs/supabase/discussions/34614)) Supavisor is the connection pooler (transaction + session modes). | The **Postgres data** is portable (it's just Postgres — `pg_dump` and go). The **auth tables + RLS coupling to `auth.uid()`** and the client libraries are Supabase-shaped; migrating auth away means rewriting policies and re-homing password hashes. Self-hostable (Docker) but that is a real ops commitment for a solo maintainer. |
| **Neon** | Postgres | RLS (see 2.1); Neon has an RLS/"Authorize" path that maps a JWT to Postgres roles. Auth is **not** bundled the way Supabase's is — you bring Auth.js/better-auth/Clerk. | No first-party auth (has "Neon Auth", a bundled third-party — check current status). | As 2.1: no Africa. | High — plain Postgres. |
| **Turso / libSQL** | SQLite fork (libSQL) | **No Postgres RLS** (not Postgres). Multi-tenancy on Turso is idiomatically **database-per-tenant** (free tier allows 100+ DBs, 500M row reads/mo) — which **conflicts with the fixed "one shared database + account key" constraint** — or app-layer scoping in one DB. SQLite is **single-writer**; transactions are serialized. Embedded replicas need a **persistent filesystem** ("not suitable for serverless environments without persistent filesystems") and shouldn't be read during `.sync()`. Turso now steers new projects to its newer "Turso Sync" product. ([docs.turso.tech embedded-replicas](https://docs.turso.tech/features/embedded-replicas/introduction), [turso.tech/pricing](https://turso.tech/pricing)) | No first-party email/password auth. | AWS regions only now (Fly regions being retired); no Africa. Embedded replica model is the story for latency, not region choice. | libSQL is SQLite-compatible → fairly portable, but the embedded-replica architecture and Turso Cloud API are vendor-shaped. |
| **PlanetScale** | Postgres (2.1) or Vitess/MySQL | MySQL path: **no RLS** at all → app-layer scoping only. Postgres path: RLS as any Postgres. | No first-party auth. | No Africa. | Postgres path portable; Vitess path less so. |

### 2.3 Embedded / single-file store

- **`better-sqlite3`** (synchronous, in-process) or **libSQL local file** or
  **PGlite** (Postgres compiled to WASM/native, embeddable). One process, one
  file, `account_key` column, app-layer scoping. `better-sqlite3` and
  `@libsql/client` / `libsql` are in Next's `serverExternalPackages` allow-list,
  so they bundle cleanly in Route Handlers / Server Components / Server Actions.
- **Only works where the app is a single long-lived process with a persistent
  disk** — a VPS, a Fly.io machine with a volume, a Docker container with a
  mounted volume, Railway with a volume. **Does not work on Vercel / any
  scale-out serverless platform** (ephemeral FS, multiple instances, no shared
  writer).
- No RLS (SQLite); Postgres RLS is available if you use PGlite, but PGlite is
  young and single-connection.
- Transactions: `better-sqlite3` supports them synchronously and fast; SQLite is
  single-writer so heavy concurrency serializes (fine at "solo engineer + a few
  hundred users" scale, a ceiling later).
- Operationally the **simplest**: backup = copy the file (or Litestream /
  `VACUUM INTO`); migrations = any SQL migration runner; zero network hop, so the
  East-Africa latency question **disappears for queries** (the DB is in the same
  process as the app — latency is then just the user↔app-server hop, wherever you
  host).

---

## 3. Row-level tenant enforcement — maturity of each path

### 3.1 Postgres RLS (the database enforces it)

Source: [postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

- **In core since PostgreSQL 9.5 (2016).** Mature, widely used for multi-tenancy.
- `ALTER TABLE t ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`. With RLS enabled
  and no policy, default-deny (no rows). Permissive policies OR together;
  restrictive policies AND.
- Current tenant is supplied one of three ways: `current_user` (a real DB role
  per tenant — not viable for a shared pooled connection), a **session/local
  config var** read with `current_setting('app.current_account', true)` and set
  per request via `SET LOCAL app.current_account = '…'` inside a transaction, or
  role membership.
- **Critical caveats for a shared-DB design:**
  - **Superusers and roles with `BYPASSRLS` always bypass.** The app must connect
    as a normal, non-superuser role.
  - **The table owner bypasses RLS by default** — you must
    `ALTER TABLE t FORCE ROW LEVEL SECURITY` (or, better, have the app role *not*
    be the table owner).
  - Referential-integrity checks (FKs), `TRUNCATE`, and `REFERENCES` are **not**
    subject to RLS — schema design must avoid cross-tenant FK leaks.
  - Backups: set `row_security = off` so a filtered dump errors rather than
    silently dropping rows.
- With PgBouncer/Supavisor **transaction-mode** pooling, the `SET LOCAL` + query
  must be in the **same transaction** (all the ORM wrappers above do this).

### 3.2 Single data-access module / DAL that always injects the filter

- Next.js's **own recommended pattern for new projects** (authentication.md,
  data-security.md). Enforcement lives in a `server-only` module; every read and
  write goes through it; it calls `verifySession()` and adds
  `where account_key = <current>`.
- Maturity: it's a discipline, not a feature. Strength = the single funnel; risk =
  any code path that reaches the DB *around* the funnel (a stray Route Handler, a
  script, a future contributor). Next mitigates with `import 'server-only'`, the
  `taint` API, and audit guidance ("verify database packages and env vars are not
  imported outside the DAL").
- Works with **any** store in Section 2, including SQLite/embedded where RLS
  doesn't exist.

### 3.3 ORM global scope / query middleware

- Drizzle: you write the `where`, or use an RLS wrapper. No "global scope" feature
  — closest is a custom query helper.
- Prisma: Client Extension `$allModels.$allOperations` hook that injects
  `where: { accountKey }` on every query — works even on MySQL/SQLite (no DB
  support needed). Third-party libs exist. Caveat: raw queries
  (`$queryRaw`) bypass the hook.
- Kysely: no hook system; a wrapper module is the mechanism.

### 3.4 Defence in depth

- RLS **and** a DAL is the belt-and-braces option Next's docs gesture at ("The
  majority of security checks should be performed as close as possible to your
  data source"). RLS is the backstop that catches a missing `where`; the DAL is
  the ergonomic primary path and the only place to enforce cross-row rules RLS
  can't express cheaply.
- Costs: two mechanisms to keep in sync (a new table needs both a policy and a
  DAL method), and RLS needs the pooling/transaction plumbing.

---

## 4. Where each option assumes the app runs

| Option | Runs on Vercel/serverless? | Runs on a Node/Docker host? | Cold-start / pooling notes |
|---|---|---|---|
| Managed Postgres + ORM, **pooled** connection string | Yes | Yes | Serverless: many short-lived instances → **must** use the provider's transaction pooler (PgBouncer/Supavisor/`-pooler`). Neon Free **scales to zero** → first query after idle pays a few-hundred-ms wake-up. A long-lived Node host holds one warm pool and a pinned always-on compute (paid) → no cold start, simplest. |
| Managed Postgres + ORM, **HTTP driver** (`@neondatabase/serverless`) | Yes (designed for it) | Yes | One-shot HTTP queries dodge pooling entirely but can't do multi-statement transactions / `SET LOCAL` → **RLS-via-session-var doesn't work over the HTTP driver**; use the WebSocket driver or app-layer scoping there. |
| **Supabase** | Yes (`@supabase/ssr`) | Yes | Same pooling story (Supavisor). PostgREST path is stateless HTTP. RLS uses the JWT, not a session var, so pooling mode doesn't break it. |
| **Turso embedded replica** | **No** ("not suitable for serverless … without persistent filesystems") | Yes (needs persistent disk) | Designed for a long-lived server that keeps a local file synced. Turso Cloud (remote-only, no embedded replica) *can* be hit from serverless over HTTP. |
| **Embedded** (`better-sqlite3` / libSQL file / PGlite) | **No** | Yes (needs persistent disk + single writer) | Zero network latency to the DB; no pooling; backup = file copy. The single-writer ceiling is the trade. |
| Auth.js / better-auth / hand-rolled (Node) | Yes | Yes | All are Node-runtime libraries; Next 16 proxy is Node-only so there's no edge constraint to satisfy any more. |
| Clerk / WorkOS / Supabase Auth (hosted identity) | Yes | Yes | Identity lives on the vendor; every cold start still works because verification is a JWT check (fast) or a cached call. |

**Bottom line on hosting:** the choice between *serverless (Vercel-style)* and
*one long-running Node container* is upstream of most of Section 2. A container
with a volume unlocks the embedded option, removes pooling and cold-start
concerns, and lets you co-locate app + Postgres in one region (including
`af-south-1`). Serverless keeps ops minimal but forces a poolable managed DB and
accepts wake-up latency on free tiers. Ticket 05's "deployment shape" note and
`map.md`'s deferred "Deployment shape" bullet are the same decision.

---

## 5. Auth options

Method is fixed: **email + password, with reset**, open self-serve signup, and a
**stable id that becomes the `account_key` on every row** (1:1 Account↔Engineer).

### 5.1 Hand-rolled against the chosen store

- Exactly what Next's `authentication.md` walks through: a `<form>` → Server
  Action → Zod validate → `bcrypt`/`argon2` hash → insert `users` row → create
  session. Session either **stateless** (JWT in an `HttpOnly` cookie via **Jose**,
  or encrypted cookie via **iron-session**) or **database-backed** (a `sessions`
  table, encrypted session id in the cookie).
- **Stable id:** you own the `users` table, so the PK (a UUID you generate, or
  `gen_random_uuid()`) is the account key and never changes. Total control.
- **Next 16 fit:** cleanest of all — Server Action for login/signup, `cookies()`
  (async) to set/read, a `verifySession()` DAL helper wrapped in React `cache()`,
  optimistic redirect in `proxy.ts`. No library-vs-framework version risk.
- **Cost:** you build and maintain reset tokens, email verification, rate
  limiting, password rules, session revocation, "log out everywhere". Next's docs
  repeatedly warn this "can quickly become complex."
- Password hashing: `@node-rs/argon2` or `@node-rs/bcrypt` (both in
  `serverExternalPackages`), or `bcrypt`/`argon2`.

### 5.2 Auth.js (NextAuth v5, `next-auth@beta`)

- `auth.ts` exports `{ handlers, signIn, signOut, auth }`; `auth()` is the
  universal session accessor (server components, route handlers, proxy, server
  actions). Route handler at `app/api/auth/[...nextauth]/route.ts`.
- **Email/password = the `Credentials` provider, and it has hard limits:**
  - **Credentials forces `session.strategy: "jwt"`. The database-adapter /
    database-session path is not supported with Credentials.** You get a
    stateless JWT cookie session only (unless you re-implement session
    persistence by hand in the `jwt`/`session` callbacks).
    ([authjs.dev credentials](https://authjs.dev/getting-started/authentication/credentials),
    [next-auth#4394](https://github.com/nextauthjs/next-auth/discussions/4394))
  - Auth.js **explicitly discourages** passwords: "we recommend a more modern and
    secure authentication mechanism … instead." You still write the hashing,
    rate-limiting, and reset yourself; the provider only gives you the
    `authorize()` callback.
- **Stable id:** whatever your `authorize()` returns as `user.id` flows into the
  JWT `sub`; you control it (it's your DB row). Stable.
- **Next 16 fit:** v5 targets the App Router; `auth()` works in Node proxy. Verify
  the installed `next-auth` beta against `next@16.3.4` (v5 is still beta; the
  Credentials + JWT path is the well-trodden one).
- Net: with passwords, Auth.js is mostly giving you cookie/CSRF plumbing and a
  session shape — much of the hard part (reset, verification, throttling) is still
  yours, similar to 5.1 but with a framework to learn.

### 5.3 better-auth

- TypeScript-first, **self-hosted** (your database), framework-agnostic with a
  documented Next integration: handler at `app/api/auth/[...all]/route.ts` via
  `toNextJsHandler()`; read session server-side with
  `auth.api.getSession({ headers: await headers() })`; the **`nextCookies()`
  plugin** sets cookies from Server Actions.
  ([better-auth.com/docs/integrations/next](https://www.better-auth.com/docs/integrations/next))
- **Sessions are database-backed by default** (a `session` table: `id`, `token`,
  `userId`, `expiresAt`, `ipAddress`, `userAgent`), 7-day expiry with sliding
  `updateAge`; **optional cookie cache** (signed/JWT/JWE short-lived cookie) so
  the common path doesn't hit the DB every request. Revocation is immediate in
  the DB (cached cookie can lag until it expires).
  ([better-auth.com/docs/concepts/session-management](https://www.better-auth.com/docs/concepts/session-management))
- Creates `user` / `session` / `account` tables; **email/password is a
  first-class built-in** (not a discouraged edge case), with **email
  verification and password reset** in the box, plus an **organization /
  multi-tenancy plugin**. Password hashing handled by the library (scrypt by
  default; configurable).
- **Stable id:** better-auth generates the `user.id` (string; generator is
  configurable) and it's your DB row → stable, usable directly as `account_key`.
- **Next 16 fit:** Node library; with Next 16 proxy being Node-only it can do a
  full session check in `proxy.ts` if wanted, or an optimistic
  `getSessionCookie()` check. Needs the 32+ char secret. Works with the same
  Postgres you'd pick in 05 (Kysely-based adapter, or Drizzle/Prisma adapters).
- The 2025 default recommendation from several sources now that **Lucia is
  deprecated** (see 5.4).

### 5.4 Lucia — **deprecated**

- **Deprecated March 2025. No npm package going forward; it is now a
  "learning resource" / reference implementation for rolling your own
  session-token auth** (the `code/auth_session.ts` single-file pattern).
  ([github.com/lucia-auth/lucia discussion #1714](https://github.com/lucia-auth/lucia/discussions/1714),
  [wisp.blog/blog/lucia-auth-is-dead](https://www.wisp.blog/blog/lucia-auth-is-dead-whats-next-for-auth))
- Practically: "use Lucia" today means "hand-roll per Lucia's guide" — a variant
  of 5.1, not a dependency you add.

### 5.5 Clerk (hosted identity)

- `@clerk/nextjs`: `clerkMiddleware()` (→ `proxy` in 16), `auth()` and
  `currentUser()` in server components / route handlers; `Auth` object carries
  `userId`, `sessionId`, `orgId`.
  ([clerk.com/docs/references/nextjs/overview](https://clerk.com/docs/references/nextjs/overview))
- Session model: short-lived JWT (default ~60s) refreshed via a client-side
  handshake; verification is a fast local JWT check.
- **Stable id:** `user_xxxxx`, stable for the life of the user — usable as
  `account_key`. But the **user record (email, password hash, profile) lives in
  Clerk, not your DB** → your `accounts` table stores Clerk's id as a foreign
  key; migrating off Clerk means exporting users and re-homing credentials.
- **Free tier (as of 2026-02-05): 50,000 MRU** (monthly *retained* users — a
  narrower unit than MAU); Pro from $20/mo beyond that.
  ([clerk.com/pricing](https://clerk.com/pricing),
  [saasprices.net/blog/clerk-free-plan-changes](https://saasprices.net/blog/clerk-free-plan-changes))
- Fit: least code, most vendor coupling; email deliverability (verification /
  reset) is Clerk's problem, which is a plus for East-Africa deliverability.

### 5.6 WorkOS AuthKit (hosted identity)

- `@workos-inc/authkit-nextjs`: hosted or embeddable login; middleware helper;
  session accessor for server components / route handlers.
- Session model: JWT access token + refresh, sealed session cookie.
- **Stable id:** WorkOS `user_...` id, stable; same "user record lives with the
  vendor" trade-off as Clerk.
- **Free for up to 1,000,000 MAU**, no time limit, including email/password,
  social, MFA, user management; you only pay for enterprise SSO/SCIM connections
  ($125/connection/mo) which this product will never need.
  ([workos.com/pricing](https://workos.com/pricing),
  [idsync.com/guides/workos-pricing](https://idsync.com/guides/workos-pricing))
- Fit: the most generous free tier of the hosted options for a free consumer-ish
  product; still vendor-homed identity.

### 5.7 Supabase Auth (only if 05 lands on Supabase)

- Covered in 2.2. Email/password + confirmations; **stable `auth.users.id` UUID**;
  JWT (~1h) + refresh; `auth.uid()` ties directly into RLS policies;
  `@supabase/ssr` does the Next cookie dance. Password hashes and the auth schema
  live in *your* Supabase Postgres (more portable than Clerk/WorkOS, less than a
  hand-rolled `users` table). Email delivery uses Supabase's built-in SMTP unless
  you wire your own (custom SMTP strongly recommended for production
  deliverability — relevant to East Africa).

### 5.8 Auth cross-cut: the account-key requirement

Every option above can yield a **stable, non-changing id** suitable as
`account_key`:

- Hand-rolled / Auth.js / better-auth: your `users` row PK (generate a UUID).
- Clerk / WorkOS: the vendor's `user_...` id (store it as your `accounts.auth_id`).
- Supabase: `auth.users.id` UUID.

The design question for 06/07 is whether `account_key` **is** that id or whether
you mint a **separate `account_id`** (own it, 1:1 with the auth identity) so the
row-level key never depends on an external vendor's id format. `map.md` fixes
Account as its own concept 1:1 with Engineer, which points toward a separate
`account_id` you control regardless of auth choice.

---

## 6. East Africa (Tanzania) region / latency relevance

- **No managed Postgres BaaS in the survey (Neon, Supabase, PlanetScale, Turso)
  offers an African region.** Supabase declined a South-Africa region on
  operational grounds; Neon and PlanetScale have no Africa presence.
- **AWS `af-south-1` (Cape Town) is the only in-continent AWS region**; AWS also
  has edge/local presence in Nairobi. Reaching `af-south-1` means self-managing a
  Postgres (RDS / Cloud SQL-equivalent / a VPS) or self-hosting Supabase there.
- Historic reality: **traffic from East Africa often routes via Europe.**
  Measurement work (UCT, "Measuring Cloud Latency in Africa") finds AWS African
  IPs concentrated in South Africa and Kenya, with much African-destined traffic
  landing in Frankfurt / Paris / London. Practical lowest-latency managed choices
  for Dar es Salaam are therefore **`eu-central-1` (Frankfurt)** or
  **`ap-south-1` (Mumbai)** — both reachable over subsea cable (SEACOM / EASSy /
  TEAMS / PEACE), typically ~120–180 ms RTT; `af-south-1` can be *worse* from
  East Africa than Europe depending on peering, though terrestrial fibre is
  improving.
- **Design implications that matter more than the region pick:**
  - Every DB round trip crosses that ~150 ms each way. Favours: the **DAL /
    server-component** model (queries run server-side next to the DB, the browser
    makes one request), **co-locating the app server and the DB in the same
    region**, and **minimising round trips per page** (batch queries, avoid
    N+1, avoid a chatty ORM lazy-load).
  - **Serverless cold start + scale-to-zero stacks on top** of the geographic
    latency (Neon Free wake-up). A pinned/always-on compute or a long-lived
    Node host removes that layer.
  - The **embedded store** (Section 2.3) makes DB latency ~0 and leaves only the
    user↔app-server hop — but then the app server's region *is* the latency, and
    you're hosting it yourself somewhere with a persistent disk.
  - Online-required v1 (no local-first) means the ~150 ms is felt on every
    interaction that isn't optimistic-updated; worth keeping in mind for 08's
    "issue / record delivery" flows.

---

## 7. Quick map to the downstream tickets

- **05 (data-store category):** managed Postgres + ORM (portable, RLS-capable,
  needs pooling + a host decision) vs Supabase BaaS (batteries-included, RLS +
  Auth wired, no Africa region, moderate lock-in) vs Turso/embedded (simplest ops
  & zero DB latency, but conflicts with "one shared DB" for Turso's per-tenant
  idiom, single-writer ceiling, needs a persistent-disk host, no RLS). Transaction
  support: Postgres/`better-sqlite3` yes; Neon HTTP driver no.
- **06 (tenant enforcement):** Postgres RLS is mature (since 9.5) and DB-enforced
  but needs non-owner role + `FORCE RLS` + transaction-scoped `SET LOCAL` +
  FK-leak care; a single DAL funnel is Next's recommended pattern and store-agnostic
  (the only option if 05 picks SQLite); defence-in-depth combines both at a
  sync cost. Id exposure (slugs vs UUIDs) and 404-vs-403 are orthogonal and
  unblocked by this research.
- **07 (auth approach):** hand-rolled (max control, max work), Auth.js (passwords
  = Credentials + forced JWT sessions, still build reset/verify/throttle yourself),
  **better-auth** (email/password + reset + verification + DB sessions
  first-class, self-hosted in your DB, Lucia's de-facto successor), Clerk (50k MRU
  free, identity vendor-homed), WorkOS AuthKit (1M MAU free, identity
  vendor-homed), Supabase Auth (only if 05 = Supabase; UUID + RLS integration).
  All yield a stable account-key id; consider minting your own `account_id`
  regardless. Email deliverability to East Africa favours a real transactional
  provider (Resend/Postmark/SES) or a vendor that handles it (Clerk/WorkOS).

---

## Sources

Primary — bundled Next.js 16.3.4 docs (`web/node_modules/next/dist/docs/`):
- `01-app/02-guides/upgrading/version-16.md`
- `01-app/02-guides/authentication.md`
- `01-app/02-guides/authentication-with-cache-components.md`
- `01-app/02-guides/data-security.md`
- `01-app/02-guides/multi-tenant.md`
- `01-app/03-api-reference/03-file-conventions/proxy.md`
- `01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`
- `01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`
- `01-app/01-getting-started/17-deploying.md`
- `web/package.json`, `web/AGENTS.md`

Primary — vendor documentation:
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Drizzle RLS: https://orm.drizzle.team/docs/rls
- Prisma RLS client extension: https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security
- Neon regions: https://neon.com/docs/introduction/regions
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase SA-region discussion: https://github.com/orgs/supabase/discussions/34614
- PlanetScale for Postgres: https://planetscale.com/blog/planetscale-for-postgres
- PlanetScale Postgres connections: https://planetscale.com/docs/postgres/connecting
- Turso embedded replicas: https://docs.turso.tech/features/embedded-replicas/introduction
- Turso pricing: https://turso.tech/pricing
- better-auth Next integration: https://www.better-auth.com/docs/integrations/next
- better-auth session management: https://www.better-auth.com/docs/concepts/session-management
- Auth.js installation: https://authjs.dev/getting-started/installation
- Auth.js Credentials provider: https://authjs.dev/getting-started/authentication/credentials
- Auth.js DB-session + Credentials: https://github.com/nextauthjs/next-auth/discussions/4394
- Lucia deprecation: https://github.com/lucia-auth/lucia/discussions/1714 ; https://www.wisp.blog/blog/lucia-auth-is-dead-whats-next-for-auth
- Clerk Next.js overview: https://clerk.com/docs/references/nextjs/overview
- Clerk pricing: https://clerk.com/pricing ; https://saasprices.net/blog/clerk-free-plan-changes
- WorkOS pricing: https://workos.com/pricing ; https://idsync.com/guides/workos-pricing
- Cloud latency in Africa (measurement study): https://pubs.cs.uct.ac.za/1704/1/Measuring_Cloud_Latency_in_Africa.pdf
- AWS in Africa: https://aws.amazon.com/local/africa/

Secondary (context/corroboration only): Prisma+better-auth guide
(prisma.io/docs/guides/authentication/better-auth/nextjs), Neon RLS+Drizzle
guide (neon.com/docs/guides/rls-drizzle), various 2026 pricing trackers cited inline.
