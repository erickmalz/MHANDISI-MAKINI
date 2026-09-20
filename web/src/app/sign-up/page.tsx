"use client";

import { useActionState } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { signup, type SignupState } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Notice } from "@/components/ui/Notice";
import { useRich, useT } from "@/lib/i18n/client";
import { translateIfKey } from "@/lib/i18n/translate";

const initialState: SignupState = {};

export default function SignUpPage() {
  const t = useT();
  const rich = useRich();
  const [state, formAction, pending] = useActionState(signup, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>
        <BrandLogo width={200} priority />

        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          {t("auth.signUp.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("auth.signUp.intro")}
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
          <Field label={t("auth.signUp.fullName")} required error={fieldErrors.fullName}>
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              className={controlClass}
            />
          </Field>

          <Field label={t("auth.signUp.email")} required error={fieldErrors.email}>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className={controlClass}
            />
          </Field>

          <Field
            label={t("auth.signUp.phone")}
            required
            hint={t("auth.signUp.phoneHint")}
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
            label={t("auth.signUp.password")}
            required
            hint={t("auth.signUp.passwordHint")}
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
                aria-invalid={fieldErrors.acceptedTerms ? true : undefined}
                aria-describedby={fieldErrors.acceptedTerms ? "accepted-terms-error" : undefined}
                className="mt-1 size-4"
              />
              <span>
                {rich("auth.signUp.accept", {
                  terms: (
                    <Link href="/legal/terms" className="font-bold underline">
                      {t("auth.signUp.termsLink")}
                    </Link>
                  ),
                  privacy: (
                    <Link href="/legal/privacy" className="font-bold underline">
                      {t("auth.signUp.privacyLink")}
                    </Link>
                  ),
                })}
              </span>
            </label>
            {fieldErrors.acceptedTerms && (
              <p
                id="accepted-terms-error"
                role="alert"
                className="text-sm font-bold text-destructive"
              >
                {translateIfKey(t, fieldErrors.acceptedTerms)}
              </p>
            )}
          </div>

          {state.error && (
            <Notice tone="error">{state.error}</Notice>
          )}

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={pending}
          >
            {pending ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
          </Button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            {t("auth.signUp.haveAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}
