"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { signupSchema } from "@/lib/auth/password-schema";
import { db } from "@/lib/data/db";
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

  try {
    const result = await auth.api.signUpEmail({
      body: { name: fullName, email, password, phone },
      headers: await headers(),
    });
    await db.execute(
      sql`SELECT app.record_terms_acceptance(${result.user.id}, ${ACCEPTED_LEGAL_VERSION})`,
    );
  } catch (error) {
    if (error instanceof APIError) {
      // Reuse better-auth's message for "email already registered" etc.
      return { error: error.message || "Could not create your account. Try again." };
    }
    throw error;
  }

  redirect("/");
}
