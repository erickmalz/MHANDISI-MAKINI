"use client";

import { useEffect, useRef } from "react";

import { Button, buttonClassName } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

/**
 * What every error boundary shows: what happened, what to do next, a way out.
 * No guess at the cause and no raw error text — the digest is only a
 * reference the engineer can quote, never the explanation.
 *
 * The way out is a plain link (full page load), not client navigation: after
 * a failure that is the most reliable way to a clean state, and it also works
 * inside `global-error`, where the root layout is gone.
 */
export function ErrorScreen({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Keep the failure visible in logs; the message itself is not shown.
    console.error(error);
  }, [error]);

  useEffect(() => {
    // Move focus to the message so keyboard and screen-reader users land on it.
    heading.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <title>{`${t("chrome.error.title")} — ${t("chrome.brand.name")}`}</title>
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-[1.75rem] font-bold text-foreground outline-none"
      >
        {t("chrome.error.title")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t("chrome.error.body")}
      </p>
      {error.digest && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("chrome.error.reference", { digest: error.digest })}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="primary" type="button" onClick={() => retry()}>
          {t("chrome.error.retry")}
        </Button>
        {/* Hard navigation on purpose: see the note above the component. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={buttonClassName("secondary")}>
          {t("chrome.error.chooseProject")}
        </a>
      </div>
    </main>
  );
}
