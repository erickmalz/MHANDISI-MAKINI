-- Bootstrap roles and the application database for local development.
-- Runs once, as the `postgres` superuser, on the container's first boot.
--
-- Mirrors the production role split from ADR 0001 / multi-tenancy ticket 06:
--
--   mhandisi_owner  owns the schema and every table; runs migrations.
--                   NOT a superuser, so FORCE ROW LEVEL SECURITY binds it.
--   app_runtime     the Next.js runtime connection. Non-owner, NOBYPASSRLS.
--                   Row-level security is the backstop beneath the DAL.
--   maintenance     session-less jobs (Phase 4: deletion sweep, dormancy mail).
--                   BYPASSRLS, credentials kept apart from the app.
--
-- Passwords here are local-development-only and must never be reused.

CREATE ROLE mhandisi_owner LOGIN PASSWORD 'owner_local_dev'
  NOSUPERUSER NOBYPASSRLS CREATEDB NOCREATEROLE;

CREATE ROLE app_runtime LOGIN PASSWORD 'app_local_dev'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

CREATE ROLE maintenance LOGIN PASSWORD 'maintenance_local_dev'
  NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;

CREATE DATABASE mhandisi OWNER mhandisi_owner;

\connect mhandisi

GRANT CONNECT ON DATABASE mhandisi TO app_runtime, maintenance;

-- The `app` schema holds helper functions (uuid v7, the RLS installer,
-- the account-provisioning trigger). Owned by mhandisi_owner; created here
-- so the first migration can attach to it.
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION mhandisi_owner;

-- Everything the app touches lives in `public`, created and owned by the owner.
-- Migrations grant table privileges explicitly; nothing is granted by default.
ALTER SCHEMA public OWNER TO mhandisi_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_runtime, maintenance;
GRANT USAGE ON SCHEMA app TO app_runtime, maintenance;
