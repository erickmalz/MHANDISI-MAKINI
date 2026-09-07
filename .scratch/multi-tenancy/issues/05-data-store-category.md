# Data store: category and the constraints it must meet

Type: grilling
Status: resolved
Blocked by: 04

## Question

Phase 1 bucketed the data store into "tech/architecture specifics — a future
implementation-planning effort." That future is now. Using ticket 04's findings,
decide the **category** and the **hard constraints**, not necessarily the exact
product.

- **Category**: managed Postgres + ORM, a backend-as-a-service, or something
  else. Weigh against: the isolation model is fixed (shared DB + account key),
  online-required, free product, a solo maintainer, East African users.
- **Row-level tenant enforcement**: is database-enforced isolation (Postgres
  RLS) a requirement, or is application-layer scoping acceptable if it is the
  single funnel for all data access? (Feeds ticket 06.)
- **Constraints the store must satisfy**: runs with the Next.js 16 app's
  server; supports transactions (the financial model needs them); backups;
  a migration story; affordable at zero and at modest scale.
- **Lock-in tolerance**: how portable must the choice be — is being tied to one
  provider's proprietary features acceptable for speed, or must it stay
  swappable?

**Constraint from ticket 03 (data-protection stance):** hosting the database
**outside Tanzania is acceptable** for v1, provided it is disclosed in the
Privacy Policy and the PDPC cross-border transfer permit is pursued. This means
`af-south-1` self-managed Postgres is **not** forced — Frankfurt / Mumbai managed
options stay on the table. If this ticket instead concludes in-country hosting is
required, that reopens ticket 03's posture.

Resolve by naming the category, the enforcement requirement, and the constraint
list. Picking the specific product can be a fast-follow once the category is set.

## Answer

**Category: one standard PostgreSQL instance, co-located with the app, reached
through a thin SQL-first query layer.** Not a backend-as-a-service (Supabase,
Neon, Turso), not an embedded SQLite/PGlite file. Portability is a hard
requirement: the whole database must move to another provider with a `pg_dump`,
with no dependence on a vendor's proprietary auth tables, realtime, edge
functions, or client SDK. A managed Postgres is fine *as long as* it is plain
Postgres underneath and gives the role control below.

**App-runtime shape (decided here because it is upstream of the category):** the
app runs as **one long-running Node/Docker container with a persistent volume**
(Fly.io / Railway / Render or similar), **not** serverless/Vercel-style. This
lets the app and the database sit in one region — ideally one host — which
removes connection-pooling, cold-start, and per-query cross-region latency as
concerns, and it is what makes multi-statement transactions and
transaction-scoped `SET LOCAL` (needed for RLS) straightforward. The specific
host, backup cadence, and uptime/monitoring surface are a fast-follow (see the
map's *Deployment shape* note, now narrowed).

**Enforcement requirement (feeds ticket 06):** **database-enforced tenant
isolation via Postgres RLS is a hard, non-negotiable requirement.** The database
itself must refuse cross-account rows even when application code forgets a
filter. This is defence in depth: RLS is the backstop, and a single
`server-only` data-access layer (DAL) is the ergonomic primary path. Ticket 06
designs the mechanism (non-owner role, `FORCE ROW LEVEL SECURITY`, where the
current account id comes from, `SET LOCAL` wiring) and still owns the orthogonal
id-exposure and 404-vs-403 questions. The RLS requirement is what rules out
SQLite/embedded and any managed tier that only hands you one god-role.

**Query/access layer: Drizzle** (`drizzle-kit` for migrations). Chosen over
Prisma and Kysely because its Postgres RLS primitives (`pgPolicy()`, `pgRole()`,
transaction wrappers that set and reset the session var) are first-class and
SQL-first rather than a bolt-on client extension (Prisma) or entirely
hand-rolled (Kysely). Feeds tickets 06 and 08.

**Hard-constraint list the store must satisfy:**

1. **Standard PostgreSQL 15+**, no proprietary extension required for core
   function — the database moves with a `pg_dump`.
2. **Co-located with the app** — same region, ideally same host — so the
   East-Africa round-trip cost is paid once (user↔app), not per query.
3. **Multi-statement transactions** with transaction-scoped `SET LOCAL` (the
   financial model needs atomicity; RLS needs the session var). Rules out
   HTTP one-shot Postgres drivers.
4. **Role control**: the app connects as a **non-owner, non-superuser role**,
   and tables can be set `FORCE ROW LEVEL SECURITY`. Rules out managed tiers
   that only expose a single owner/superuser role.
5. **Versioned migrations checked into the repo** (`drizzle-kit`), applied over
   a direct (non-pooled) connection.
6. **Automated daily backup + tested restore**, plus ad-hoc `pg_dump` export
   (the same export also serves the Account-data export from ticket 03).
7. **Cost**: $0 at zero users; under ~$25/month at a few hundred Engineers
   (one small Postgres + one app container + volume).

**Hosting location:** ticket 03's note stands unchanged — hosting the database
**outside Tanzania is acceptable** for v1 (disclosed in the Privacy Policy, PDPC
cross-border transfer permit pursued). This decision does **not** conclude that
in-country hosting is required, so ticket 03's posture is not reopened.
Practical region: Frankfurt (`eu-central-1`) or the closest low-latency option.

**Specific product: fast-follow.** The category + constraint list above is
enough to unblock tickets 06, 07, and 08. The concrete Postgres host is decided
with the map's *Deployment shape* work.

Recorded as [ADR 0001](../../../docs/adr/0001-postgres-rls-on-a-long-running-container.md)
for the build effort.
