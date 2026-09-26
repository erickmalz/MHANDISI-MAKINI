import type { Metadata } from "next";
import Script from "next/script";
import { FocusFirstInvalid } from "@/components/FocusFirstInvalid";
import { RouteLoadingOverlay } from "@/components/RouteLoadingOverlay";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { catalogues } from "@/lib/i18n/catalogues";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import { manrope, inter } from "./fonts/brand";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    // Pages set a short title ("Funding requests"); the template adds the brand.
    title: {
      default: t("chrome.metadata.title"),
      template: "%s — Mhandisi Makini",
    },
    description: t("chrome.metadata.description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint, so the explicit choice (or the
            OS preference) is already correct by the time anything renders —
            see THEME_INIT_SCRIPT's own doc comment. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider locale={locale} messages={catalogues[locale]}>
          <RouteLoadingOverlay>{children}</RouteLoadingOverlay>
          <FocusFirstInvalid />
        </I18nProvider>
      </body>
    </html>
  );
}
