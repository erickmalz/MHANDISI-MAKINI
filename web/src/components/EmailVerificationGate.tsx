"use client";

import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { useRich, useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { BrandLogo } from "./BrandLogo";
import { SignOutButton } from "./SignOutButton";

/**
 * The hardened email gate (ticket 02): shown instead of the app once an
 * unverified account is more than 7 days old. Sign-in still succeeds, but
 * nothing else is reachable until the link is clicked.
 */
export function EmailVerificationGate({ email }: { email: string }) {
  const t = useT();
  const rich = useRich();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  function resend() {
    setError(false);
    startTransition(async () => {
      const { error: err } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/",
      });
      if (err) setError(true);
      else setSent(true);
    });
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 text-center sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center">
        <BrandLogo width={160} priority />
        <h1 className="mt-8 text-[1.75rem] font-bold text-foreground">
          {t("chrome.verifyGate.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {rich("chrome.verifyGate.body", { email: <span className="font-bold">{email}</span> })}
        </p>

        <div className="mt-6">
          <Button variant="primary" onClick={resend} disabled={pending}>
            {pending
              ? t("chrome.verifyGate.sending")
              : sent
                ? t("chrome.verifyGate.resendAgain")
                : t("chrome.verifyGate.resend")}
          </Button>
        </div>

        {sent && (
          <Notice tone="success" className="mt-3 text-left">
            {t("chrome.verifyGate.sent")}
          </Notice>
        )}
        {error && (
          <Notice tone="error" className="mt-3 text-left">
            {t("chrome.verifyGate.failed")}
          </Notice>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          {t("chrome.verifyGate.wrongAccount")} <SignOutButton variant="inline" />
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {rich("chrome.verifyGate.stuck", {
            support: (
              <a className="font-bold text-foreground underline" href="mailto:support@mhandisimakini.app">
                {"support@mhandisimakini.app"}
              </a>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
