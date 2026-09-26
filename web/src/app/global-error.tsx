"use client";

import Script from "next/script";
import { ErrorScreen } from "@/components/ErrorScreen";
import { catalogues } from "@/lib/i18n/catalogues";
import { I18nProvider } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import { manrope, inter } from "./fonts/brand";
import "./globals.css";

/** The layout is gone here, so read the saved language straight from the cookie. */
function savedLocale() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return isLocale(match?.[1]) ? match[1] : DEFAULT_LOCALE;
}

/**
 * Last resort: catches a failure in the root layout itself. It replaces the
 * layout, so it brings its own <html>, <body>, styles, font and translations.
 */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = savedLocale();
  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider locale={locale} messages={catalogues[locale]}>
          <ErrorScreen {...props} />
        </I18nProvider>
      </body>
    </html>
  );
}
