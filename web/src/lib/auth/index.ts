import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { sql } from "drizzle-orm";

import { db } from "@/lib/data/db";
import * as schema from "@/lib/data/schema";

import { hashPassword, verifyPassword } from "./argon2";
import { isBreachedPassword } from "./breached-passwords";
import { sendResetPasswordEmail, sendVerificationEmail } from "./emails";

const SECONDS = 1;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// Endpoints that set a new password from `body.newPassword` (better-auth 1.7
// `/reset-password` and `/change-password`). Sign-up is covered by the
// signup action's Zod schema instead.
const NEW_PASSWORD_PATHS = new Set(["/reset-password", "/change-password"]);

function build() {
  if (!process.env.BETTER_AUTH_SECRET) {
    // Fail loudly on first use rather than mint unsigned cookies. Deferred to
    // here (not module load) so `next build` succeeds in a pipeline that only
    // injects runtime secrets at deploy time.
    throw new Error("BETTER_AUTH_SECRET is not set.");
  }

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

    // baseURL is always trusted; this adds any extra origins (comma-separated)
    // that may call the auth API — e.g. a phone on the LAN hitting the dev
    // server by IP for a mobile preview. Unset in production.
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),

    // Sign-up goes only through the `signup()` Server Action, which runs
    // signupSchema (breached password, phone, name, terms) and records terms
    // acceptance. `disabledPaths` 404s the public HTTP route in the router's
    // onRequest; the action's direct `api.signUpEmail` call doesn't hit the
    // router, so it keeps working.
    disabledPaths: ["/sign-up/email"],

    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      transaction: true,
    }),

    // better-auth's tables are all `auth_`-prefixed so `account` elsewhere
    // means the domain Account (ADR 0002).
    user: {
      modelName: "auth_user",
      additionalFields: {
        phone: { type: "string", required: true, input: true },
      },
    },
    session: {
      modelName: "auth_session",
      expiresIn: 7 * DAYS, // 7-day sliding session (ticket 02)
      updateAge: 1 * DAYS,
      cookieCache: { enabled: true, maxAge: 60 * SECONDS }, // 60s cookie cache
    },
    account: { modelName: "auth_account" },
    verification: { modelName: "auth_verification" },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10, // full rule set is in ./password-schema.ts
      maxPasswordLength: 128,
      requireEmailVerification: false, // soft gate — see ./session.ts
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1 * HOURS,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(hash, password),
      },
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(user.email, url);
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 1 * DAYS, // 24h verify link (ticket 02)
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user.email, url);
      },
    },

    // Abuse controls (ticket 02) — DB-backed so they survive restarts, no Redis.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "auth_rate_limit",
    },

    advanced: {
      // Fly's edge sets `Fly-Client-IP` to the real client address. The
      // default `x-forwarded-for` is client-appendable, and a spoofed
      // multi-hop value resolves to no IP — collapsing everyone into one
      // shared rate-limit bucket. In dev/test with no header better-auth
      // falls back to 127.0.0.1.
      ipAddress: { ipAddressHeaders: ["fly-client-ip"] },
    },

    hooks: {
      // The breached-password rule (./password-schema.ts) otherwise only runs
      // at sign-up; apply it wherever better-auth accepts a new password.
      // Throws the i18n key, same as the Zod schema's error.
      before: createAuthMiddleware(async (ctx) => {
        if (!NEW_PASSWORD_PATHS.has(ctx.path)) return;
        const pw: unknown = ctx.body?.newPassword;
        if (typeof pw === "string" && isBreachedPassword(pw)) {
          throw new APIError("BAD_REQUEST", {
            message: "auth.validation.passwordCommon",
          });
        }
      }),
    },

    databaseHooks: {
      session: {
        create: {
          // "Any sign-in during the [30-day deletion] window cancels it"
          // (ticket 02, Slice 2.8 Part 4). Fires on every new session — sign-in,
          // and signup/verify-email's `autoSignIn` above, harmlessly, since
          // there's nothing scheduled yet at either of those points. Goes
          // through `app.cancel_account_deletion` (migration 0005), a
          // SECURITY DEFINER function: no account context exists yet at this
          // point (same chicken-and-egg as `app.record_terms_acceptance`,
          // migration 0001), so this can't go through `withAccount`.
          after: async (session) => {
            await db.execute(sql`SELECT app.cancel_account_deletion(${session.userId})`);
          },
        },
      },
    },

    // nextCookies() must be last — it writes Set-Cookie from Server Actions.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof build> | null = null;

/**
 * The better-auth instance, built on first use. Every server entry point goes
 * through this (via `verifySession()` / the route handler / the signup action).
 */
export function getAuth() {
  return (instance ??= build());
}

export type Session = ReturnType<typeof build>["$Infer"]["Session"];
