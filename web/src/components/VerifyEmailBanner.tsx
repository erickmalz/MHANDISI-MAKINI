"use client";

import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { useT } from "@/lib/i18n/client";

/**
 * Persistent "verify your email" banner shown on every authenticated screen
 * while the account is unverified (the soft gate, ticket 02). At 7 days the
 * gate hardens — `app/(app)/layout.tsx` swaps the whole page for
 * `EmailVerificationGate` instead.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useT();
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
      if (err) {
        setError(true);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="border-b border-health-amber/30 bg-health-amber-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <span className="font-bold text-health-amber">{t("chrome.verifyBanner.title")}</span>
        <span role="status" className="text-foreground">
          {sent
            ? t("chrome.verifyBanner.sent")
            : error
              ? t("chrome.verifyBanner.failed")
              : t("chrome.verifyBanner.default", { email })}
        </span>
        {!sent && (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="font-bold text-foreground underline disabled:opacity-60"
          >
            {pending ? t("chrome.verifyBanner.sending") : t("chrome.verifyBanner.resend")}
          </button>
        )}
      </div>
    </div>
  );
}
