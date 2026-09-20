"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { useT } from "@/lib/i18n/client";

/**
 * `header` — white text for the charcoal AppChrome.
 * `inline` — charcoal underlined link for use on light surfaces.
 * `menu` — a full-width menu row for the light popover.
 */
export function SignOutButton({
  variant = "header",
}: {
  variant?: "header" | "inline" | "menu";
}) {
  const t = useT();
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
    ? t("chrome.header.signOut.failed")
    : pending
      ? t("chrome.header.signOut.pending")
      : t("chrome.header.signOut.idle");

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="inline-flex min-h-12 cursor-pointer items-center px-1 font-bold text-foreground underline disabled:opacity-60"
      >
        {label}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="flex min-h-12 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm font-bold text-foreground hover:bg-muted disabled:opacity-60"
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
      className="inline-flex min-h-12 shrink-0 cursor-pointer items-center rounded-lg px-3 text-sm font-bold text-on-inverse hover:bg-white/10 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
