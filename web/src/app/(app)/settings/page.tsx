import { notFound } from "next/navigation";

import { GRACE_PERIOD_DAYS, getAccountDeletionStatus, getAccountProfile } from "@/lib/data";

import { AccountDeletionForm } from "./_components/AccountDeletionForm";
import { AccountLogoForm } from "./_components/AccountLogoForm";
import { AccountProfileForm } from "./_components/AccountProfileForm";
import { DataExportCard } from "./_components/DataExportCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card } from "@/components/ui/Card";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("settings.pageTitle");

/**
 * Account settings (Slice 2.8) — name/phone, letterhead logo, the (read-only)
 * sign-in email, data export (Part 3), and self-serve deletion (Part 4).
 * `getAccountProfile` returns `null` only if the Account row is somehow gone
 * mid-session (it's created atomically with the `auth_user` by the
 * provisioning trigger), in which case there is nothing to show.
 */
export default async function SettingsPage() {
  const [profile, deletionStatus] = await Promise.all([
    getAccountProfile(),
    getAccountDeletionStatus(),
  ]);
  if (!profile) notFound();
  const t = await getT();

  let deleteAt: Date | null = null;
  if (deletionStatus.scheduledAt) {
    deleteAt = new Date(deletionStatus.scheduledAt);
    deleteAt.setDate(deleteAt.getDate() + GRACE_PERIOD_DAYS);
  }

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("settings.crumbProjects"), href: "/" }]}
        title={t("settings.title")}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-xl font-bold text-card-foreground">{t("settings.language.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.language.hint")}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </Card>
        <AccountProfileForm
          initial={{ fullName: profile.fullName, phone: profile.phone }}
          email={profile.email}
        />
        <AccountLogoForm hasLogo={profile.hasLogo} />
        <DataExportCard />
        <AccountDeletionForm email={profile.email} deleteAt={deleteAt} />
      </div>
    </PageFrame>
  );
}
