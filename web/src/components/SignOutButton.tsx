"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

/**
 * `header` — white text for the charcoal AppChrome.
 * `inline` — charcoal underlined link for use on light surfaces.
 */
export function SignOutButton({
  variant = "header",
}: {
  variant?: "header" | "inline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function signOut() {
    setFailed(false);
    startTransition(async () => {
      const { error } = await authClient.signOut();
      if (error) {
        setFailed(true);
        return;
      }
      router.replace("/sign-in");
      router.refresh();
    });
  }

  const label = failed
    ? "Try sign out again"
    : pending
      ? "Signing out…"
      : "Sign out";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="font-bold text-foreground underline disabled:opacity-60"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-on-inverse hover:bg-white/10 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
