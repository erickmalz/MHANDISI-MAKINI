"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";

export default function SignInPage() {
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
      setFormError("Email or password is incorrect.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <BrandLogo width={200} priority />

        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">Sign in</h1>
        <p className="mt-1 text-muted-foreground">
          Sign in, then choose the project you want to work on.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            label="Email"
            required
            error={
              attempted && emailMissing ? "Enter your email address." : undefined
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
            label="Password"
            required
            error={
              attempted && passwordMissing ? "Enter your password." : undefined
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
            <p className="text-sm font-bold text-destructive">{formError}</p>
          )}

          <Button variant="primary" type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/reset-password" className="font-bold text-foreground underline">
            Forgotten your password?
          </Link>
          <Link href="/sign-up" className="font-bold text-foreground underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
