import type { Metadata } from "next";

import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    // The tagline stays in English unless a translation is approved (brand guidelines).
    title: { absolute: `${t("chrome.brand.name")} — ${t("chrome.brand.tagline")}` },
    description: t("auth.welcome.description"),
  };
}

export default async function WelcomePage() {
  const t = await getT();
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 text-center sm:px-6">
      <div className="flex w-full max-w-xl flex-col items-center">
        <div className="mb-6 flex w-full justify-end">
          <LanguageSwitcher />
        </div>
        <BrandLogo width={220} priority />

        <h1 className="mt-8 text-[2.25rem] font-bold leading-tight text-foreground">
          {t("auth.welcome.heading")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("auth.welcome.body")}</p>

        <div className="mt-8">
          <Button variant="primary" href="/sign-in">
            {t("auth.welcome.signIn")}
          </Button>
        </div>
      </div>
    </main>
  );
}
