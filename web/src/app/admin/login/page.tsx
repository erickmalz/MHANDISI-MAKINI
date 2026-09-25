"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resolvePostSignInRedirect } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { authClient } from "@/lib/auth/client";
import { Notice } from "@/components/ui/Notice";

/**
 * The Platform Admin login page (`.scratch/admin-portal/` ticket 01) — a
 * separate route and form from `/sign-in`, not mixed into the Engineer flow,
 * but no new credential store: a Platform Admin is still one `auth_user`
 * row, submitting through the same `authClient.signIn.email` better-auth
 * call. Reuses `resolvePostSignInRedirect` unchanged — it already sends an
 * admin to `/admin` and anyone else to `/`, which is exactly the
 * no-enumeration behaviour this page wants on success.
 *
 * Deliberately plain, English-only chrome matching the rest of `/admin`
 * (which is not i18n'd — it is an internal ops surface, not Engineer-facing
 * product), not the branded `/sign-in` page.
 */
export default function AdminLoginPage() {
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
      // Generic message, no enumeration — same instinct as /sign-in.
      setFormError("Email or password is incorrect.");
      return;
    }

    const target = await resolvePostSignInRedirect();
    router.replace(target);
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <h1 className="text-[1.75rem] font-bold text-foreground">
          Platform Admin
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sign in with your admin account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            label="Email"
            required
            error={attempted && emailMissing ? "Enter your email address." : undefined}
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
            error={attempted && passwordMissing ? "Enter your password." : undefined}
          >
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={controlClass}
            />
          </Field>

          {formError && <Notice tone="error">{formError}</Notice>}

          <Button variant="primary" type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
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
