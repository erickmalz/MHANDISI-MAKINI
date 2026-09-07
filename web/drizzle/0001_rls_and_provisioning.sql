-- Tenant-scoping plumbing (multi-tenancy tickets 06 / 07, ADR 0004).
--
-- Assumes the roles `app_runtime` (non-owner, NOBYPASSRLS) and `maintenance`
-- (BYPASSRLS) already exist — they are infrastructure, created by
-- docker/postgres/init/00-roles.sql locally and by the provisioning step in
-- CI / production, never by a migration.

GRANT USAGE ON SCHEMA public TO app_runtime, maintenance;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO app_runtime, maintenance;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.enable_standard_rls(table) — the one RLS treatment every account-scoped
-- domain table gets in Phase 2. ENABLE + FORCE + one identical policy keyed on
-- `account_id = current_setting('app.current_account_id')`. Unset GUC -> NULL
-- -> matches nothing -> fails closed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.enable_standard_rls(target regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	tbl text := target::text;
BEGIN
	EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
	EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
	EXECUTE format('DROP POLICY IF EXISTS account_isolation ON %s', tbl);
	EXECUTE format(
		'CREATE POLICY account_isolation ON %s
		 USING (account_id = current_setting(''app.current_account_id'', true)::uuid)
		 WITH CHECK (account_id = current_setting(''app.current_account_id'', true)::uuid)',
		tbl
	);
END;
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- accounts: its own RLS. ENABLE (not FORCE) — the owner must bootstrap-write
-- this one table through the provisioning trigger below. `app_runtime` is a
-- non-owner role, so ENABLE alone binds it and it fails closed. Policy keys on
-- the row's own `id`, not `account_id`.
-- ---------------------------------------------------------------------------
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_self ON "accounts"
	USING (id = current_setting('app.current_account_id', true)::uuid)
	WITH CHECK (id = current_setting('app.current_account_id', true)::uuid);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.provision_account() — AFTER INSERT ON auth_user. Creates the matching
-- accounts row atomically with the user, whatever fires the insert.
-- SECURITY DEFINER so it runs as the owner and is not blocked by the
-- accounts policy during signup (no account context is set yet).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.provision_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
	INSERT INTO public.accounts (id, user_id, full_name, phone)
	VALUES (app.uuid_generate_v7(), NEW.id, NEW.name, NEW.phone);
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auth_user_provision_account
	AFTER INSERT ON "auth_user"
	FOR EACH ROW
	EXECUTE FUNCTION app.provision_account();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.account_id_for_user(auth_user_id) — resolves the tenant key from the
-- session's user id. SECURITY DEFINER: it must read `accounts` before any
-- account context exists (the chicken-and-egg at the start of every request).
-- getCurrentAccountId() is the only caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.account_id_for_user(p_user_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	SELECT id FROM public.accounts WHERE user_id = p_user_id;
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.record_terms_acceptance(auth_user_id, version) — the one privileged
-- write the signup Server Action makes after signUpEmail returns, before the
-- new session's cookie is readable. SECURITY DEFINER for the same reason as
-- above.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.record_terms_acceptance(p_user_id text, p_version text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	UPDATE public.accounts
	SET accepted_terms_version = p_version,
	    accepted_terms_at = now()
	WHERE user_id = p_user_id;
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Runtime grants. `app_runtime` is the app (better-auth included, per
-- ticket 06); it never owns a table. `maintenance` gets read on accounts now
-- for the Phase 4 jobs.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
	"auth_user", "auth_session", "auth_account", "auth_verification", "auth_rate_limit"
	TO app_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "accounts" TO app_runtime;
--> statement-breakpoint
GRANT SELECT ON "accounts" TO maintenance;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
	app.uuid_generate_v7(),
	app.account_id_for_user(text),
	app.record_terms_acceptance(text, text)
	TO app_runtime;
--> statement-breakpoint
-- Future domain tables are owned by the owner; grant DML to app_runtime by
-- default so Phase 2 migrations don't each repeat it.
ALTER DEFAULT PRIVILEGES FOR ROLE mhandisi_owner IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE mhandisi_owner IN SCHEMA public
	GRANT SELECT ON TABLES TO maintenance;
