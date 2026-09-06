"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);

  const emailMissing = email.trim().length === 0;
  const passwordMissing = password.length === 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (emailMissing || passwordMissing) return;
    router.push("/");
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
      <Image
        src="/brand/logo-stacked.png"
        alt="Mhandisi Makini"
        width={927}
        height={1044}
        priority
        className="h-auto w-[160px]"
      />

      <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">Sign in</h1>
      <p className="mt-1 text-muted-foreground">
        Sign in, then choose the project you want to work on.
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

        <Button variant="primary" type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-sm">
        <Link href="/welcome" className="font-bold text-foreground underline">
          Forgotten your password?
        </Link>
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        This prototype does not check credentials — any email and password sign
        you in.
      </p>
      </div>
    </main>
  );
}
