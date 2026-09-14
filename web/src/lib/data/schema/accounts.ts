/**
 * The domain tenant key (multi-tenancy ticket 06).
 *
 * `accounts` is its own concept, 1:1 with `auth_user`. Every account-scoped
 * domain table (Phase 2 onward) carries `account_id` referencing `accounts.id`
 * — nothing in the domain schema references `auth_user.id`, so the auth layer
 * can be swapped without touching a single row key.
 *
 * A row is created by the `AFTER INSERT ON auth_user` trigger
 * (`app.provision_account`, migration `0001`) so it exists atomically with the
 * user. The signup Server Action then fills the recorded Terms/Privacy
 * acceptance.
 *
 * RLS: ENABLE (not FORCE) with the policy
 *   USING/WITH CHECK (id = current_setting('app.current_account_id', true)::uuid)
 * `app_runtime` is a non-owner role, so ENABLE alone binds it and it fails
 * closed when the GUC is unset. FORCE is deliberately omitted here — the owner
 * must bootstrap-write this one table via the provisioning trigger. Every
 * Phase 2 domain table gets ENABLE + FORCE. See ADR 0004.
 */
import { sql } from "drizzle-orm";
import { customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auth_user } from "./auth";

/**
 * Raw image bytes for the Account logo (slice 2.8). Stored in Postgres rather
 * than an external object store — the app is a single self-hosted container
 * with no S3/blob/CDN today (ADR 0001's no-new-infra stance), and a letterhead
 * logo is small, so row bloat is a non-issue.
 */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const accounts = pgTable("accounts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`app.uuid_generate_v7()`),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  // Filled by the signup Server Action immediately after signUpEmail succeeds.
  acceptedTermsVersion: text("accepted_terms_version"),
  acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true }),
  // Letterhead logo (slice 2.8) — both null until the Engineer uploads one;
  // `getDocumentProfile` treats a null logo as "no logo on the letterhead".
  logo: bytea("logo"),
  logoContentType: text("logo_content_type"),
  // Self-serve account deletion (ticket 02). Null = not scheduled. Set by the
  // delete-account Server Action; cleared by any successful sign-in while it's
  // set (that's how "cancel by signing in" works — see slice 2.8's sign-in
  // action). The maintenance-role sweep hard-deletes any account whose value
  // here is more than 30 days in the past.
  deletionScheduledAt: timestamp("deletion_scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
