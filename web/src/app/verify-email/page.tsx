"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { authClient } from "@/lib/auth/client";
import { useT } from "@/lib/i18n/client";

/**
 * Fallback landing / resend page. The verification link in the email goes
 * straight to `/api/auth/verify-email` and better-auth redirects on success;
 * this page is for an expired link or someone who needs the mail again.
 */
export default function VerifyEmailPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim().length === 0) return;
    setStatus("sending");
    const { error } = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: "/",
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>
        <BrandLogo width={160} priority />
        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          {t("auth.verifyEmail.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("auth.verifyEmail.intro")}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field label={t("auth.verifyEmail.email")} required>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={controlClass}
            />
          </Field>

          {status === "sent" && (
            <Notice tone="success">
              {t("auth.verifyEmail.sent")}
            </Notice>
          )}
          {status === "error" && (
            <Notice tone="error">
              {t("auth.verifyEmail.failed")}
            </Notice>
          )}

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={status === "sending"}
          >
            {status === "sending" ? t("auth.verifyEmail.sending") : t("auth.verifyEmail.submit")}
          </Button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            {t("auth.verifyEmail.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}
