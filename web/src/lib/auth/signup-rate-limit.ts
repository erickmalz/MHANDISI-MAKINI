import "server-only";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/lib/data/db";

/**
 * Per-IP throttle on the signup Server Action (src/app/actions/auth.ts).
 *
 * better-auth's own rate limiter only runs inside its HTTP router, so a
 * server-side `auth.api.signUpEmail()` call bypasses it entirely — without this
 * a script could create unlimited accounts and send unlimited verification
 * emails through Resend to arbitrary addresses.
 *
 * It reuses better-auth's `auth_rate_limit` table (no migration: `key` is
 * UNIQUE and `app_runtime` already has SELECT/INSERT/UPDATE on it, migration
 * 0001). Keys are prefixed `signup-action|` so they can never collide with
 * better-auth's own `${ip}|${path}` keys. Here `last_request` holds the start
 * of a fixed window rather than better-auth's last-hit time.
 *
 * The client IP is Fly's `fly-client-ip` header, which the Fly proxy sets
 * itself (a client can't forge it). Outside production with no such header
 * (local dev, tests) limiting is skipped; in production a missing header falls
 * into one shared "unknown" bucket, so it fails closed rather than open.
 */
const MAX_SIGNUPS = 5;
const WINDOW_MS = 60 * 60 * 1000;

/** Counts this attempt and reports whether it is within the limit. */
export async function consumeSignupAttempt(): Promise<boolean> {
  const ip = (await headers()).get("fly-client-ip")?.trim();
  if (!ip && process.env.NODE_ENV !== "production") return true;

  const key = `signup-action|${ip || "unknown"}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // One statement, so concurrent attempts serialise on the `key` row: a new
  // key starts at 1; an expired window resets to 1; otherwise it increments.
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO "auth_rate_limit" ("id", "key", "count", "last_request")
    VALUES (gen_random_uuid()::text, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "auth_rate_limit"."last_request" <= ${windowStart} THEN 1
        ELSE "auth_rate_limit"."count" + 1
      END,
      "last_request" = CASE
        WHEN "auth_rate_limit"."last_request" <= ${windowStart} THEN ${now}
        ELSE "auth_rate_limit"."last_request"
      END
    RETURNING "count"
  `);

  return Number(result.rows[0]?.count ?? 0) <= MAX_SIGNUPS;
}
