"use client";

import { useActionState } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { signup, type SignupState } from "@/app/actions/auth";

const initialState: SignupState = {};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <BrandLogo width={200} priority />

        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-muted-foreground">
          One account per engineer. Your projects and figures stay private to
          you.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
          <Field label="Full name" required error={fieldErrors.fullName}>
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              className={controlClass}
            />
          </Field>

          <Field label="Email" required error={fieldErrors.email}>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className={controlClass}
            />
          </Field>

          <Field
            label="Phone"
            required
            hint="Stored for your reports and contact only — never used to sign in."
            error={fieldErrors.phone}
          >
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className={controlClass}
            />
          </Field>

          <Field
            label="Password"
            required
            hint="At least 10 characters. Avoid common words and predictable patterns."
            error={fieldErrors.password}
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className={controlClass}
            />
          </Field>

          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                name="acceptedTerms"
                type="checkbox"
                className="mt-1 size-4"
              />
              <span>
                I accept the{" "}
                <Link href="/legal/terms" className="font-bold underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="font-bold underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {fieldErrors.acceptedTerms && (
              <p className="text-sm font-bold text-destructive">
                {fieldErrors.acceptedTerms}
              </p>
            )}
          </div>

          {state.error && (
            <p className="text-sm font-bold text-destructive">{state.error}</p>
          )}

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
