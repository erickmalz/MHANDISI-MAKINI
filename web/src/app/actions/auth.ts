"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { sql } from "drizzle-orm";

import { getAuth } from "@/lib/auth";
import { signupSchema } from "@/lib/auth/password-schema";
import { verifySession } from "@/lib/auth/session";
import { consumeSignupAttempt } from "@/lib/auth/signup-rate-limit";
import { db } from "@/lib/data/db";
import { isPlatformAdmin } from "@/lib/data/platform-admin";
import { ACCEPTED_LEGAL_VERSION } from "@/lib/legal";

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<Record<"fullName" | "email" | "phone" | "password" | "acceptedTerms", string>>;
};

/**
 * Signup runs server-side so the full password rules (../lib/auth/password-schema)
 * and the recorded Terms/Privacy acceptance happen where they can't be skipped.
 * better-auth creates the `auth_user`; the `app.provision_account` trigger
 * creates the matching `accounts` row atomically; this action then records the
 * terms acceptance via a SECURITY DEFINER function (the new session's cookie
 * isn't readable yet within this same request).
 */
export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: SignupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<SignupState["fieldErrors"]>;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { fullName, email, phone, password } = parsed.data;

  // better-auth's rate limiter doesn't cover server-side api calls; only
  // well-formed attempts count toward the per-IP limit.
  if (!(await consumeSignupAttempt())) {
    return { error: "auth.signUp.tooMany" };
  }

  try {
    const result = await getAuth().api.signUpEmail({
      body: { name: fullName, email, password, phone },
      headers: await headers(),
    });
    await db.execute(
      sql`SELECT app.record_terms_acceptance(${result.user.id}, ${ACCEPTED_LEGAL_VERSION})`,
    );
  } catch (error) {
    if (error instanceof APIError) {
      // Catalogue keys (translated by Notice), never better-auth's raw English text.
      const code = String((error.body as { code?: string } | undefined)?.code ?? "");
      return {
        error: code.includes("ALREADY_EXISTS") ? "auth.signUp.emailTaken" : "auth.signUp.failed",
      };
    }
    throw error;
  }

  redirect("/");
}

/**
 * Where the sign-in form (`src/app/sign-in/page.tsx`) sends a just-signed-in
 * session (`.scratch/platform-admin/` ticket 02) — `/admin` for a Platform
 * Admin, `/` (Choose Project) for everyone else, exactly as before this
 * capability existed. Sign-in itself stays client-side (better-auth's own
 * cookie-setting flow); this only decides the redirect target once that's
 * done, re-verifying the session server-side rather than trusting the
 * client's copy of it.
 */
export async function resolvePostSignInRedirect(): Promise<string> {
  const result = await verifySession();
  if (!result) return "/sign-in";

  const admin = await isPlatformAdmin(result.user.id);
  return admin ? "/admin" : "/";
}
