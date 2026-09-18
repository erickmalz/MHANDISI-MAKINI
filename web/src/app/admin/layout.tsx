import type { ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import { requirePlatformAdmin } from "@/lib/auth/session";

/**
 * The Platform Admin route group (`.scratch/platform-admin/` ticket 02).
 * `requirePlatformAdmin()` is the authoritative check — redirects to
 * /sign-in without a session, to / (no distinct 403/404) without the flag.
 * Deliberately its own chrome, not `AppChrome` — a Platform Admin is not an
 * Engineer and this is not the Account-scoped app shell.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requirePlatformAdmin();

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link href="/admin" className="font-bold text-foreground">
          Platform Admin
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <SignOutButton variant="inline" />
        </div>
      </header>
      {children}
    </>
  );
}
