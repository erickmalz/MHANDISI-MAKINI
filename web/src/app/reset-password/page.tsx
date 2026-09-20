import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { richMessage } from "@/lib/i18n/rich";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("auth.resetPassword.pageTitle");

/**
 * Phase 4 builds the full reset flow (request form + set-new-password landing,
 * single-use 1-hour link, revoke other sessions, mark email verified — ticket
 * 02). This placeholder keeps the sign-in link honest until then.
 */
export default async function ResetPasswordPage() {
  const t = await getT();
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 text-center sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>
        <BrandLogo width={160} className="mx-auto" priority />
        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          {t("auth.resetPassword.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {richMessage(t, "auth.resetPassword.body", {
            support: (
              <a
                className="font-bold text-foreground underline"
                href="mailto:support@mhandisimakini.app"
              >
                {"support@mhandisimakini.app"}
              </a>
            ),
          })}
        </p>
        <p className="mt-6 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            {t("auth.resetPassword.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}
