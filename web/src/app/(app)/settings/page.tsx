import { notFound } from "next/navigation";

import { getAccountProfile } from "@/lib/data";

import { AccountLogoForm } from "./_components/AccountLogoForm";
import { AccountProfileForm } from "./_components/AccountProfileForm";

/**
 * Account settings (Slice 2.8 Part 2) — name/phone, letterhead logo, and the
 * (read-only) sign-in email. `getAccountProfile` returns `null` only if the
 * Account row is somehow gone mid-session (it's created atomically with the
 * `auth_user` by the provisioning trigger), in which case there is nothing
 * to show.
 */
export default async function SettingsPage() {
  const profile = await getAccountProfile();
  if (!profile) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-[1.75rem] font-bold text-foreground">Settings</h1>

      <div className="flex flex-col gap-6">
        <AccountProfileForm
          initial={{ fullName: profile.fullName, phone: profile.phone }}
          email={profile.email}
        />
        <AccountLogoForm hasLogo={profile.hasLogo} />
      </div>
    </main>
  );
}
