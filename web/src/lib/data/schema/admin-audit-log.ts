/**
 * Audit trail of Platform Admin actions (`.scratch/admin-portal/` ticket
 * 05) — every admin mutation (schedule/cancel a deletion, add/remove an
 * admin) writes one row here, inside the same function as the mutation
 * itself. Visible only inside `/admin`, never to the Engineer whose Account
 * an entry concerns.
 *
 * Not row-level-security scoped — same posture as `platform_admins` itself:
 * no `account_id` to scope by, gated at the application layer. No
 * retention/purge policy — indefinite, consistent with the app having no
 * general audit-log mechanism elsewhere.
 */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { accounts } from "./accounts";
import { auth_user } from "./auth";

export const admin_audit_log = pgTable("admin_audit_log", {
  id: uuid("id")
    .primaryKey()
    .default(sql`app.uuid_generate_v7()`),
  actorAuthUserId: text("actor_auth_user_id")
    .notNull()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  // 'schedule_deletion' | 'cancel_deletion' | 'add_admin' | 'remove_admin'
  action: text("action").notNull(),
  // Set for schedule_deletion / cancel_deletion; null otherwise.
  targetAccountId: uuid("target_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  // Set for add_admin / remove_admin; null otherwise.
  targetAuthUserId: text("target_auth_user_id").references(
    () => auth_user.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
