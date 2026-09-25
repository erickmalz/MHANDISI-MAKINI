import type { ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { AdminNav } from "./AdminNav";

/**
 * The Platform Admin route group (`.scratch/platform-admin/` ticket 02).
 * `requirePlatformAdmin()` is the authoritative check — redirects to
 * /sign-in without a session, to / (no distinct 403/404) without the flag.
 * Deliberately its own chrome, not `AppChrome` — a Platform Admin is not an
 * Engineer and this is not the Account-scoped app shell. It still follows
 * the same charcoal + yellow-accent system as the rest of the product
 * (SKILL.md §"Applications beyond the app" / §4 Navigation) — no logo and
 * no bottom nav, since a fixed bottom nav belongs only in the main customer
 * app and a dense admin workflow isn't the place for the brand mark.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requirePlatformAdmin();

  return (
    <>
      <header className="border-b border-white/10 bg-surface-inverse text-on-inverse">
        <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
            <Link
              href="/admin"
              className="inline-flex min-h-12 shrink-0 items-center rounded-lg px-2 font-bold text-on-inverse"
            >
              Platform Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm text-on-inverse/70">
            <span className="hidden sm:inline">{user.email}</span>
            <SignOutButton variant="header" />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
