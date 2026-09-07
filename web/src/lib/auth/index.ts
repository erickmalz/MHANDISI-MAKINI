import "server-only";

import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/data/db";
import * as schema from "@/lib/data/schema";

import { sendResetPasswordEmail, sendVerificationEmail } from "./emails";

// OWASP argon2id parameters (m=19 MiB, t=2, p=1). `@node-rs/argon2` uses
// Argon2id by default, so `algorithm` is left unset (its `Algorithm` is a
// const enum, unusable under `isolatedModules`). This overrides better-auth's
// scrypt default (ADR 0002).
const ARGON2_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const SECONDS = 1;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

if (!process.env.BETTER_AUTH_SECRET) {
  // Fail loudly at boot rather than mint unsigned cookies.
  throw new Error("BETTER_AUTH_SECRET is not set.");
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),

  // better-auth's tables are all `auth_`-prefixed so `account` elsewhere means
  // the domain Account (ADR 0002).
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
    minPasswordLength: 10, // full rule set is in ../auth/password-schema.ts
    maxPasswordLength: 128,
    requireEmailVerification: false, // soft gate — see the 7-day check in ../auth/session.ts
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 1 * HOURS,
    password: {
      hash: (password) => argon2Hash(password, ARGON2_OPTS),
      verify: ({ hash, password }) => argon2Verify(hash, password, ARGON2_OPTS),
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

  // nextCookies() must be last — it writes Set-Cookie from Server Actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
