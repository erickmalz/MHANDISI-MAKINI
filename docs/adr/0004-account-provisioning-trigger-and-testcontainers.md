---
status: accepted
---

# The `accounts` bootstrap: an owner trigger on `auth_user`, and a not-forced RLS policy

## Context and decision

Multi-tenancy tickets 06 and 07 fixed *what* the tenancy layer is: a dedicated
`accounts` table (own UUIDv7, 1:1 with `auth_user`), `SET LOCAL
app.current_account_id` per transaction, `ENABLE` + `FORCE ROW LEVEL SECURITY`
with one identical policy on every domain table, a `server-only`
`getCurrentAccountId()` composed on the auth session check. Building Phase 1
surfaced two implementation questions the tickets left open.

### 1. How the `accounts` row is created atomically with the user

better-auth owns the `auth_user` insert. Its `databaseHooks.user.create.after`
does not reliably run inside better-auth's own signup transaction, and its
signup path connects (like the rest of the app, per ticket 06) as the non-owner
`app_runtime` role.

**Decision: an `AFTER INSERT ON auth_user` trigger** —
`app.provision_account()`, `SECURITY DEFINER`, owned by `mhandisi_owner` —
inserts the matching `accounts` row (`id = app.uuid_generate_v7()`,
`user_id = NEW.id`, `full_name`/`phone` copied from the user). The trigger is
database-native, so the `accounts` row exists atomically with the user whatever
fires the insert — better-auth today, a data import tomorrow.

The recorded Terms/Privacy acceptance (ticket 02) is written straight after, by
the signup Server Action, through a second `SECURITY DEFINER` function
(`app.record_terms_acceptance`). It cannot be part of the trigger because the
version string is only known to the application, and it cannot use the normal
account-scoped path because the new session's cookie is not yet readable within
the same request.

`getCurrentAccountId()` faces the same chicken-and-egg — it must read `accounts`
*before* any account context exists — and resolves it the same way, via
`app.account_id_for_user(text)`, `SECURITY DEFINER`.

### 2. `accounts` gets `ENABLE` but not `FORCE ROW LEVEL SECURITY`

`FORCE` binds the table owner too. The provisioning trigger above runs as the
owner and must be able to write `accounts` during signup, when no
`app.current_account_id` is set — `FORCE` would make that insert fail the
`WITH CHECK`.

**Decision: `accounts` is `ENABLE` only.** `app_runtime` is a non-owner role, so
`ENABLE` alone fully binds it — it sees only its own account row and fails
closed when the GUC is unset, which is the actual security requirement. `FORCE`
would only add owner-binding, and the owner is exactly who must bootstrap this
one table. **Every Phase 2 domain table keeps `ENABLE` + `FORCE`** via
`app.enable_standard_rls()`; `accounts` is the single, documented exception, and
the conformance test asserts precisely this shape.

### 3. The isolation suite runs on Testcontainers

Ticket 06's test suite must run against a real PostgreSQL — RLS does not exist
in a mock or in SQLite. **Decision: `@testcontainers/postgresql`**, which boots a
throwaway `postgres:16` per test file. Locally it needs Docker; in CI the GitHub
runner provides it. CI additionally applies the migrations against a plain
`postgres` service to catch SQL errors early. Role/database setup for both is
one code path — `web/scripts/bootstrap-db.ts` — mirroring
`docker/postgres/init/00-roles.sql`.

## Consequences

- **`app` schema functions are part of the security surface.** `SECURITY
  DEFINER` functions owned by `mhandisi_owner` (`provision_account`,
  `account_id_for_user`, `record_terms_acceptance`) each bypass RLS by design;
  they are deliberately tiny, take only an `auth_user` id, and never accept an
  account id from the caller.
- **A new tenancy helper is a migration + a grant**, not just Drizzle schema.
- **The conformance test encodes the `accounts` exception.** A future change
  that adds `FORCE` to `accounts` (or `FORCE` to nothing) fails the test on
  purpose — reopen this ADR rather than edit the test.
- **`app.uuid_generate_v7()` is hand-rolled** (Postgres 15/16 has no built-in).
  Postgres 18's native `uuidv7()` supersedes it when the deployment target
  reaches that version.
