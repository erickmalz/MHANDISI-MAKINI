"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";

/**
 * Fallback landing / resend page. The verification link in the email goes
 * straight to `/api/auth/verify-email` and better-auth redirects on success;
 * this page is for an expired link or someone who needs the mail again.
 */
export default function VerifyEmailPage() {
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
        <Image
          src="/brand/logo-stacked.png"
          alt="Mhandisi Makini"
          width={905}
          height={1000}
          priority
          className="h-auto w-[140px]"
        />
        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          Resend your verification link
        </h1>
        <p className="mt-1 text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send a fresh link.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field label="Email" required>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={controlClass}
            />
          </Field>

          {status === "sent" && (
            <p className="text-sm text-mm-success">
              If that email needs verifying, a link is on its way.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm font-bold text-destructive">
              Could not send the link. Try again in a minute.
            </p>
          )}

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send link"}
          </Button>
        </form>

        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
