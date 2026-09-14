import { notFound } from "next/navigation";

import { GRACE_PERIOD_DAYS, getAccountDeletionStatus, getAccountProfile } from "@/lib/data";

import { AccountDeletionForm } from "./_components/AccountDeletionForm";
import { AccountLogoForm } from "./_components/AccountLogoForm";
import { AccountProfileForm } from "./_components/AccountProfileForm";
import { DataExportCard } from "./_components/DataExportCard";

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

  let deleteAt: Date | null = null;
  if (deletionStatus.scheduledAt) {
    deleteAt = new Date(deletionStatus.scheduledAt);
    deleteAt.setDate(deleteAt.getDate() + GRACE_PERIOD_DAYS);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">Settings</h1>

      <div className="flex flex-col gap-6">
        <AccountProfileForm
          initial={{ fullName: profile.fullName, phone: profile.phone }}
          email={profile.email}
        />
        <AccountLogoForm hasLogo={profile.hasLogo} />
        <DataExportCard />
        <AccountDeletionForm email={profile.email} deleteAt={deleteAt} />
      </div>
    </main>
  );
}
