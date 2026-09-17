CREATE TABLE "platform_admins" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_auth_user_id_auth_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Platform Admin (`.scratch/platform-admin/`, tickets 01-03). `platform_admins`
-- is deliberately NOT row-level-security scoped — a Platform Admin owns no
-- Account, so there is no `account_id` to scope by, and every row in it is
-- inserted by hand, out-of-band (no self-serve/invite path exists). Plain
-- `app_runtime` SELECT is enough to check membership.
GRANT SELECT ON "platform_admins" TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.list_accounts_for_admin(admin_auth_user_id) — the Platform Admin's
-- Account list/detail (ticket 03). `accounts` is ENABLE-only, not FORCE
-- (ADR 0004), so this SECURITY DEFINER function, owned by the table owner,
-- already reads every Account without needing a new policy. `projects` IS
-- FORCE'd (it is real tenant data), so the owner is bound by its RLS too —
-- the per-account project count is taken by setting
-- `app.current_account_id` to each account's own id in turn inside the loop
-- and letting the existing `account_isolation` policy do its job, rather
-- than adding an admin-bypass policy to a tenant-critical table. Re-checks
-- `platform_admins` membership itself (defense in depth if the app-layer
-- check in `requirePlatformAdmin()` is ever bypassed) — never accepts an
-- account id from the caller, only the admin's own auth_user id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.list_accounts_for_admin(p_admin_user_id text)
RETURNS TABLE (
	account_id uuid,
	full_name text,
	phone text,
	email text,
	created_at timestamptz,
	accepted_terms_version text,
	accepted_terms_at timestamptz,
	deletion_scheduled_at timestamptz,
	project_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	r record;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM public.platform_admins WHERE auth_user_id = p_admin_user_id
	) THEN
		RAISE EXCEPTION 'not a platform admin';
	END IF;

	FOR r IN
		SELECT a.id, a.full_name, a.phone, u.email, a.created_at,
		       a.accepted_terms_version, a.accepted_terms_at, a.deletion_scheduled_at
		FROM public.accounts a
		JOIN public.auth_user u ON u.id = a.user_id
		ORDER BY a.created_at DESC
	LOOP
		PERFORM set_config('app.current_account_id', r.id::text, true);
		account_id := r.id;
		full_name := r.full_name;
		phone := r.phone;
		email := r.email;
		created_at := r.created_at;
		accepted_terms_version := r.accepted_terms_version;
		accepted_terms_at := r.accepted_terms_at;
		deletion_scheduled_at := r.deletion_scheduled_at;
		SELECT count(*) INTO project_count FROM public.projects p WHERE p.account_id = r.id;
		RETURN NEXT;
	END LOOP;

	PERFORM set_config('app.current_account_id', '', true);
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.list_accounts_for_admin(text) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.schedule_account_deletion_for_admin(admin_auth_user_id, account_id) —
-- ticket 03's one admin-triggerable action, reusing the exact column the
-- self-serve flow already uses (`accounts.deletion_scheduled_at`,
-- migration 0005's `app.cancel_account_deletion` is its mirror image). No
-- new mutation path — just admin access to the existing one, on an
-- arbitrary Account instead of the caller's own.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.schedule_account_deletion_for_admin(p_admin_user_id text, p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM public.platform_admins WHERE auth_user_id = p_admin_user_id
	) THEN
		RAISE EXCEPTION 'not a platform admin';
	END IF;

	UPDATE public.accounts
	SET deletion_scheduled_at = now()
	WHERE id = p_account_id
	  AND deletion_scheduled_at IS NULL;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.schedule_account_deletion_for_admin(text, uuid) TO app_runtime;