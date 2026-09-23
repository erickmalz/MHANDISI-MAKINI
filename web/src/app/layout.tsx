import type { Metadata } from "next";
import { FocusFirstInvalid } from "@/components/FocusFirstInvalid";
import { RouteLoadingOverlay } from "@/components/RouteLoadingOverlay";
import { catalogues } from "@/lib/i18n/catalogues";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import { dejaVu } from "./fonts/dejavu";
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
    <html lang={locale} className={`${dejaVu.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider locale={locale} messages={catalogues[locale]}>
          <RouteLoadingOverlay>{children}</RouteLoadingOverlay>
          <FocusFirstInvalid />
        </I18nProvider>
      </body>
    </html>
  );
}
