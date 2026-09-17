/**
 * Platform Admin flag (`.scratch/platform-admin/` ticket 01) — a person who
 * runs the service itself, not an Engineer. Its own table, keyed by
 * `auth_user.id`, mirroring how `accounts` is its own table rather than a
 * column bolted onto `auth_user` (ADR 0002 reserves the `auth_` prefix for
 * better-auth's own tables). No self-serve path: every row is inserted by
 * hand, out-of-band — there is no signup/invite flow.
 *
 * Not row-level-security scoped — a Platform Admin owns no Account, so there
 * is no `account_id` to scope by. Access is gated in the application layer
 * (`src/lib/data/platform-admin.ts`, `requirePlatformAdmin()`), and the two
 * cross-Account operations it enables go through SECURITY DEFINER functions
 * (migration `0011`) that re-check membership themselves.
 */
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { auth_user } from "./auth";

export const platform_admins = pgTable("platform_admins", {
  authUserId: text("auth_user_id")
    .primaryKey()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
