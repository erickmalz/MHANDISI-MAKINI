/**
 * better-auth's tables, self-hosted in our Postgres (ADR 0002).
 *
 * All prefixed `auth_` so `account` everywhere else means the domain Account
 * (see ./accounts.ts). `drizzle-kit` owns these migrations — better-auth never
 * runs its own migrator. The column shapes match `getAuthTables()` for the
 * options in `src/lib/auth/index.ts` (email+password, DB rate limiter, a
 * required `phone` additional field on the user).
 *
 * These tables are NOT row-level-security scoped: auth must resolve a user by
 * email before any session — and therefore any account context — exists. They
 * are protected by only ever being touched through the auth module.
 */
import {
  bigint,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const auth_user = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Required additional field — collected at signup, stored only, never used
  // for auth (ticket 02). Copied to `accounts.phone` by the provisioning
  // trigger.
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auth_session = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => auth_user.id, { onDelete: "cascade" }),
});

export const auth_account = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auth_verification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auth_rate_limit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull().default(0),
});
