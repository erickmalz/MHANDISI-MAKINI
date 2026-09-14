# Slice 2.1 — Windows runbook

The schema and tests are written and pass `tsc --noEmit` + `eslint` in WSL.
The migration file and the Testcontainers suite can only run on the Windows
side (WSL here has no Docker and a Windows-only `node_modules`). Do these
steps there.

## 1. Generate the migration

```powershell
cd web
npm run db:generate -- --name domain_structure
```

This reads the six new schema files and writes:

- `web/drizzle/0002_domain_structure.sql`
- `web/drizzle/meta/0002_snapshot.json`
- a new entry in `web/drizzle/meta/_journal.json`

It should **not** prompt (six brand-new tables + six new enums, no renames).

## 2. Append the RLS block to the generated SQL

Open `web/drizzle/0002_domain_structure.sql` and add this to the very end
(before running any migration — the file has not been applied yet, so editing
it now is safe):

```sql
--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern 0000
-- uses for the `app` schema helpers.
SELECT app.enable_standard_rls('public.projects');--> statement-breakpoint
SELECT app.enable_standard_rls('public.suppliers');--> statement-breakpoint
SELECT app.enable_standard_rls('public.subcontractors');--> statement-breakpoint
SELECT app.enable_standard_rls('public.stages');--> statement-breakpoint
SELECT app.enable_standard_rls('public.tasks');--> statement-breakpoint
SELECT app.enable_standard_rls('public.material_lines');
```

## 3. Apply and verify

```powershell
docker compose up -d            # from the repo root, if not already running
cd web
npm run db:migrate             # applies 0002
npm test                       # the isolation suite — Testcontainers
npm run lint
npm run typecheck
npm run build
```

Expected:

- `db:migrate` — "Migrations applied." with no error.
- `npm test` — `conformance.test.ts` sweeps all six new tables; the two-account
  graph test and `composite-fk.test.ts` pass.
- `db:studio` (optional) — the six tables exist, each with `account_id` NOT NULL,
  a `UNIQUE (id, account_id)` constraint, and RLS enabled + forced.

## 4. Report back

Paste me:

- the generated `web/drizzle/0002_domain_structure.sql` (so I can confirm it
  matches intent and fold the file into git history correctly), and
- any failure output from `npm test` / `npm run build`.

## Note — concurrent uncommitted work

The working tree already has unrelated uncommitted changes (mobile-preview /
LAN-origin config in `next.config.ts` and `src/lib/auth/index.ts`, brand-logo
assets, `BrandLogo.tsx`, auth-page tweaks). None of Slice 2.1 touches those.
Slice 2.1's files are:

```
web/src/lib/data/schema/{enums,projects,stages,subcontractors,suppliers,tasks,material-lines}.ts   (new)
web/src/lib/data/schema/index.ts                                                                   (6 export lines added)
web/tests/isolation/{conformance,provisioning-and-isolation,composite-fk}.test.ts + harness.ts
web/drizzle/0002_domain_structure.sql + meta/                                                      (you generate in step 1)
```
