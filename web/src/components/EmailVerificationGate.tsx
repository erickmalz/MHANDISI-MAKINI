"use client";

import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "./BrandLogo";
import { SignOutButton } from "./SignOutButton";

/**
 * The hardened email gate (ticket 02): shown instead of the app once an
 * unverified account is more than 7 days old. Sign-in still succeeds, but
 * nothing else is reachable until the link is clicked.
 */
export function EmailVerificationGate({ email }: { email: string }) {
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
          Verify your email to continue
        </h1>
        <p className="mt-2 text-muted-foreground">
          Open the link we sent to <span className="font-bold">{email}</span>.
          It has been more than 7 days, so the rest of the app stays locked
          until you do. Nothing has been deleted.
        </p>

        <div className="mt-6">
          <Button variant="primary" onClick={resend} disabled={pending}>
            {pending ? "Sending…" : sent ? "Link sent — resend" : "Resend the link"}
          </Button>
        </div>

        {sent && (
          <p className="mt-3 text-sm text-mm-success">
            Sent. Check your inbox (and spam).
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-mm-error">
            Could not send the link. Try again in a minute.
          </p>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Wrong account? <SignOutButton variant="inline" />
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Stuck? Email{" "}
          <a className="font-bold text-foreground underline" href="mailto:support@mhandisimakini.app">
            support@mhandisimakini.app
          </a>
          .
        </p>
      </div>
    </main>
  );
}
