"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth. Used for sign-in, sign-out and re-sending the
 * verification email. Sign-up goes through a Server Action
 * (`src/app/actions/auth.ts`) so the Zod rules and the terms record run on the
 * server.
 */
export const authClient = createAuthClient();
