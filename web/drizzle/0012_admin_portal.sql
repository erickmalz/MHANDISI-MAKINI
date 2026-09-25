CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"actor_auth_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_account_id" uuid,
	"target_auth_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD COLUMN "added_by" text;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_auth_user_id_auth_user_id_fk" FOREIGN KEY ("actor_auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_auth_user_id_auth_user_id_fk" FOREIGN KEY ("target_auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_added_by_auth_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint


-- Admin Portal (`.scratch/admin-portal/`, tickets 02-05) — admin-management,
-- deletion-cancel parity, and the audit log. `admin_audit_log` is
-- deliberately NOT row-level-security scoped, same posture as
-- `platform_admins` — no `account_id` to scope by, gated at the application
-- layer. Every function below is SECURITY DEFINER, owned by the table
-- owner, so none of them need a direct GRANT on `auth_user`, `accounts` or
-- `admin_audit_log` for app_runtime — same pattern as migration 0011.

-- ---------------------------------------------------------------------------
-- app.log_admin_action(...) — shared audit-log writer. Called from every
-- admin function below so the log write happens inside the same
-- transaction as the mutation, never bolted on separately in application
-- code.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.log_admin_action(
	p_actor_user_id text,
	p_action text,
	p_target_account_id uuid,
	p_target_auth_user_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	INSERT INTO public.admin_audit_log (actor_auth_user_id, action, target_account_id, target_auth_user_id)
	VALUES (p_actor_user_id, p_action, p_target_account_id, p_target_auth_user_id);
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.log_admin_action(text, text, uuid, text) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.schedule_account_deletion_for_admin(...) — redefined (same
-- parameters) to also write the audit log and report back whether it
-- actually changed anything, only when the update did (an already-scheduled
-- Account is a no-op — not worth an audit entry or a confirmation email,
-- see `sendAdminScheduledDeletionEmail` in `src/lib/auth/emails.ts`). The
-- return type is changing (void -> boolean), which Postgres won't allow via
-- CREATE OR REPLACE — migration 0011's version is dropped first.
-- ---------------------------------------------------------------------------
DROP FUNCTION app.schedule_account_deletion_for_admin(text, uuid);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.schedule_account_deletion_for_admin(p_admin_user_id text, p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	v_changed boolean;
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
	v_changed := FOUND;

	IF v_changed THEN
		PERFORM app.log_admin_action(p_admin_user_id, 'schedule_deletion', p_account_id, NULL);
	END IF;

	RETURN v_changed;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.schedule_account_deletion_for_admin(text, uuid) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.cancel_account_deletion_for_admin(...) — ticket 03's parity action,
-- the admin-side mirror of `app.cancel_account_deletion` (migration 0005),
-- but keyed by Account id like every other admin function here rather than
-- the caller's own auth_user id. Reports back whether it changed anything,
-- same reason as the schedule function above.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.cancel_account_deletion_for_admin(p_admin_user_id text, p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	v_changed boolean;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM public.platform_admins WHERE auth_user_id = p_admin_user_id
	) THEN
		RAISE EXCEPTION 'not a platform admin';
	END IF;

	UPDATE public.accounts
	SET deletion_scheduled_at = NULL
	WHERE id = p_account_id
	  AND deletion_scheduled_at IS NOT NULL;
	v_changed := FOUND;

	IF v_changed THEN
		PERFORM app.log_admin_action(p_admin_user_id, 'cancel_deletion', p_account_id, NULL);
	END IF;

	RETURN v_changed;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.cancel_account_deletion_for_admin(text, uuid) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.add_platform_admin(...) — ticket 02's self-serve grant. Looks the
-- target up by email (the only identifier the admin-management UI form
-- collects); raises distinctly on "no such user" vs "already an admin" —
-- this is an internal admin tool behind requirePlatformAdmin(), not a
-- public-facing form, so there's no enumeration concern in telling an
-- already-verified admin which case they hit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.add_platform_admin(p_admin_user_id text, p_target_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	v_target_id text;
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM public.platform_admins WHERE auth_user_id = p_admin_user_id
	) THEN
		RAISE EXCEPTION 'not a platform admin';
	END IF;

	SELECT id INTO v_target_id FROM public.auth_user WHERE email = p_target_email;
	IF v_target_id IS NULL THEN
		RAISE EXCEPTION 'user not found';
	END IF;

	IF EXISTS (SELECT 1 FROM public.platform_admins WHERE auth_user_id = v_target_id) THEN
		RAISE EXCEPTION 'already an admin';
	END IF;

	INSERT INTO public.platform_admins (auth_user_id, added_by)
	VALUES (v_target_id, p_admin_user_id);

	PERFORM app.log_admin_action(p_admin_user_id, 'add_admin', NULL, v_target_id);

	RETURN v_target_id;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.add_platform_admin(text, text) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.remove_platform_admin(...) — ticket 02's removal, with the
-- self-removal guard rail decided on the map: an admin can't remove their
-- own row from the UI (prevents accidental self-lockout).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.remove_platform_admin(p_admin_user_id text, p_target_auth_user_id text)
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

	IF p_target_auth_user_id = p_admin_user_id THEN
		RAISE EXCEPTION 'cannot remove your own admin access';
	END IF;

	DELETE FROM public.platform_admins WHERE auth_user_id = p_target_auth_user_id;

	IF FOUND THEN
		PERFORM app.log_admin_action(p_admin_user_id, 'remove_admin', NULL, p_target_auth_user_id);
	END IF;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.remove_platform_admin(text, text) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.list_platform_admins(...) — the Admins view. Joins `auth_user` for
-- email and the granting admin's own email, same "owner already has the
-- grants, no app_runtime bypass needed" pattern as list_accounts_for_admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.list_platform_admins(p_admin_user_id text)
RETURNS TABLE (
	auth_user_id text,
	email text,
	created_at timestamptz,
	added_by_email text
)
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

	RETURN QUERY
	SELECT pa.auth_user_id, u.email, pa.created_at, added_by_user.email
	FROM public.platform_admins pa
	JOIN public.auth_user u ON u.id = pa.auth_user_id
	LEFT JOIN public.auth_user added_by_user ON added_by_user.id = pa.added_by
	ORDER BY pa.created_at ASC;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.list_platform_admins(text) TO app_runtime;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- app.list_admin_audit_log(...) — the Activity view. Resolves the actor's
-- email, and whichever target applies (an Account's Engineer name, or a
-- Platform Admin's email) into plain display strings, so the DAL/UI never
-- needs a second lookup per row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.list_admin_audit_log(p_admin_user_id text)
RETURNS TABLE (
	id uuid,
	actor_email text,
	action text,
	target_account_id uuid,
	target_account_name text,
	target_auth_user_id text,
	target_user_email text,
	created_at timestamptz
)
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

	RETURN QUERY
	SELECT
		l.id,
		actor.email,
		l.action,
		l.target_account_id,
		a.full_name,
		l.target_auth_user_id,
		target_user.email,
		l.created_at
	FROM public.admin_audit_log l
	JOIN public.auth_user actor ON actor.id = l.actor_auth_user_id
	LEFT JOIN public.accounts a ON a.id = l.target_account_id
	LEFT JOIN public.auth_user target_user ON target_user.id = l.target_auth_user_id
	ORDER BY l.created_at DESC;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.list_admin_audit_log(text) TO app_runtime;
