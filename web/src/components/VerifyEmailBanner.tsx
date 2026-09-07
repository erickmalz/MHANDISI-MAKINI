"use client";

import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";

/**
 * Persistent "verify your email" banner shown on every authenticated screen
 * while the account is unverified (the soft gate, ticket 02). At 7 days the
 * gate hardens — `app/(app)/layout.tsx` swaps the whole page for
 * `EmailVerificationGate` instead.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
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
    <div className="border-b border-mm-warning/30 bg-mm-warning-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <span className="font-bold text-mm-warning">Verify your email</span>
        <span className="text-foreground">
          {sent
            ? "Sent. Check your inbox for the link."
            : error
              ? "Could not send the link. Try again in a minute."
              : `We sent a link to ${email}. Verifying unlocks password reset and changing your email.`}
        </span>
        {!sent && (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="font-bold text-foreground underline disabled:opacity-60"
          >
            {pending ? "Sending…" : "Resend link"}
          </button>
        )}
      </div>
    </div>
  );
}
