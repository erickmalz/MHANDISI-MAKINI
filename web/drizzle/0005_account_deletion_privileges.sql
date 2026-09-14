-- Slice 2.8 Part 4 (ticket 02) — the two privileged pieces self-serve account
-- deletion needs beyond the plain RLS-scoped write the request action already
-- does (src/lib/data/account-deletion.ts):
--
--   1. Cancelling on sign-in has no account context yet — same chicken-and-egg
--      as app.record_terms_acceptance in migration 0001 — so it needs a
--      SECURITY DEFINER function, called from better-auth's
--      `databaseHooks.session.create.after` (src/lib/auth/index.ts).
--   2. The maintenance-role sweep (scripts/sweep-deletions.ts) hard-deletes a
--      row past its grace period by deleting `auth_user`. `maintenance` had
--      only SELECT on `accounts` before this (migration 0001); it now also
--      needs SELECT on `auth_user` (to find + email expired candidates) and
--      DELETE on `auth_user` (every other table cascades from there).

CREATE OR REPLACE FUNCTION app.cancel_account_deletion(p_user_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
	UPDATE public.accounts
	SET deletion_scheduled_at = NULL
	WHERE user_id = p_user_id
	  AND deletion_scheduled_at IS NOT NULL;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.cancel_account_deletion(text) TO app_runtime;
--> statement-breakpoint
GRANT SELECT, DELETE ON "auth_user" TO maintenance;
