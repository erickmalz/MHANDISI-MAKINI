"use client";

import { useTransition } from "react";

import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/locales";

/**
 * Switches the interface language. Each language is named in itself (with a
 * `lang` attribute so screen readers pronounce it correctly).
 *
 * - `segmented` — both languages side by side, current one pressed (Settings,
 *   sign-in and sign-up).
 * - `header` — one button naming the OTHER language, for the charcoal header.
 * - `menu` — the same single button as a row inside the light menu popover.
 */
export function LanguageSwitcher({
  variant = "segmented",
}: {
  variant?: "segmented" | "header" | "menu";
}) {
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
    });
  };

  if (variant !== "segmented") {
    const other = LOCALES.find((l) => l !== locale) ?? locale;
    const style =
      variant === "header"
        ? "rounded-lg px-3 text-on-inverse hover:bg-on-inverse/10"
        : "w-full rounded-lg px-3 text-foreground hover:bg-muted";
    return (
      <button
        type="button"
        lang={other}
        disabled={pending}
        aria-label={t("chrome.language.switchTo", { language: LOCALE_NAMES[other] })}
        onClick={() => choose(other)}
        className={`inline-flex min-h-12 cursor-pointer items-center text-sm font-bold disabled:opacity-60 ${style}`}
      >
        {LOCALE_NAMES[other]}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="inline-flex gap-1 rounded-lg border border-control-border p-1"
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          disabled={pending}
          onClick={() => choose(option)}
          className={`inline-flex min-h-12 cursor-pointer items-center rounded-lg px-4 text-sm font-bold disabled:opacity-60 ${
            option === locale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {LOCALE_NAMES[option]}
        </button>
      ))}
    </div>
  );
}
