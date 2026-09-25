/**
 * Platform Admin flag (`.scratch/platform-admin/` ticket 01) — a person who
 * runs the service itself, not an Engineer. Its own table, keyed by
 * `auth_user.id`, mirroring how `accounts` is its own table rather than a
 * column bolted onto `auth_user` (ADR 0002 reserves the `auth_` prefix for
 * better-auth's own tables). The very first row is still inserted by hand,
 * out-of-band (no self-serve signup) — from there, an existing Platform
 * Admin can add or remove others from inside `/admin/admins`
 * (`.scratch/admin-portal/` ticket 02).
 *
 * Not row-level-security scoped — a Platform Admin owns no Account, so there
 * is no `account_id` to scope by. Access is gated in the application layer
 * (`src/lib/data/platform-admin.ts`, `requirePlatformAdmin()`), and every
 * cross-Account operation it enables goes through a `SECURITY DEFINER`
 * function (migrations `0011`, `0012`) that re-checks membership itself.
 */
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { auth_user } from "./auth";

export const platform_admins = pgTable("platform_admins", {
  authUserId: text("auth_user_id")
    .primaryKey()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  // Who granted this row, for provenance (`.scratch/admin-portal/` ticket
  // 02). Null for the out-of-band-provisioned first admin — nobody granted
  // that one from inside the portal.
  addedBy: text("added_by").references(() => auth_user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
