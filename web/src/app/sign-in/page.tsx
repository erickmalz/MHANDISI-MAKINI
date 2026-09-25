"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resolvePostSignInRedirect } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { authClient } from "@/lib/auth/client";
import { useT } from "@/lib/i18n/client";
import { Notice } from "@/components/ui/Notice";

export default function SignInPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailMissing = email.trim().length === 0;
  const passwordMissing = password.length === 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setFormError(null);
    if (emailMissing || passwordMissing) return;

    setPending(true);
    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setPending(false);

    if (error) {
      // Generic message, no enumeration (ticket 02).
      setFormError(t("auth.signIn.wrong"));
      return;
    }
    // Platform Admins land on /admin instead of Choose Project
    // (.scratch/platform-admin/ ticket 02).
    const target = await resolvePostSignInRedirect();
    router.replace(target);
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>
        <BrandLogo width={200} priority />

        <h1 className="mm-page-title mt-6 font-bold text-foreground">{t("auth.signIn.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("auth.signIn.intro")}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            label={t("auth.signIn.email")}
            required
            error={
              attempted && emailMissing ? t("auth.signIn.emailMissing") : undefined
            }
          >
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={controlClass}
            />
          </Field>

          <Field
            label={t("auth.signIn.password")}
            required
            error={
              attempted && passwordMissing ? t("auth.signIn.passwordMissing") : undefined
            }
          >
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={controlClass}
            />
          </Field>

          {formError && (
            <Notice tone="error">{formError}</Notice>
          )}

          <Button variant="primary" type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
          </Button>
        </form>

        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/reset-password" className="font-bold text-foreground underline">
            {t("auth.signIn.forgot")}
          </Link>
          <Link href="/sign-up" className="font-bold text-foreground underline">
            {t("auth.signIn.create")}
          </Link>
        </p>

        <p className="mt-6 text-sm">
          <Link href="/admin/login" className="text-muted-foreground underline">
            {t("auth.signIn.adminLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
