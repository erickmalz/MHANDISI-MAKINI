# Research: persistence + auth options for this Next.js 16 app

Type: research
Status: open
Blocked by: —

## Question

Surface the current, idiomatic ways to add a **persistent relational data store**
and **email/password auth** to the app in `web/` — Next.js 16 with Turbopack
(note `web/AGENTS.md`: this Next.js has breaking changes; read
`web/node_modules/next/dist/docs/` before relying on training-data assumptions).

Report on, at minimum:

- **Data-store shapes**: a managed Postgres + an ORM/query builder (Drizzle,
  Prisma, Kysely) hosted separately; a backend-as-a-service (Supabase, Neon,
  Turso/libSQL, PlanetScale); an embedded store. For each: does it support
  **row-level tenant enforcement** (e.g. Postgres RLS), and how mature is that
  path.
- **Auth options**: rolling email/password by hand vs. a library (Auth.js /
  NextAuth, Lucia, better-auth, Clerk, Supabase Auth, WorkOS). For each: does it
  hand you a stable **user id you can put in an account key**, session model
  (cookie vs JWT), and how it interacts with Next.js 16 server components /
  route handlers / middleware.
- **Where the app runs**: which stores/auth assume Vercel, which are portable,
  cold-start and connection-pooling implications for serverless.
- **Tanzania relevance**: latency / region availability of the managed options
  for East African users.

Capture findings at `.scratch/multi-tenancy/research/04-findings.md` and link it
from this ticket. This is input to tickets 05, 06 and 07 — surface options and
trade-offs, do not pick.
