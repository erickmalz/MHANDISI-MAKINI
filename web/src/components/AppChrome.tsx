"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "./SignOutButton";

/**
 * The shared charcoal app header — brand chrome on every authenticated screen
 * (rendered by `app/(app)/layout.tsx`; the bare `/welcome` and `/sign-in`
 * screens are outside that group and get no chrome).
 *
 * The engineer works one project at a time. When a project is open the header
 * offers a way back to the picker; the project's own name and figures live on
 * the page. The header carries the reversed horizontal lockup (no tagline)
 * directly on the charcoal — the supplied artwork, never retyped as text.
 *
 * Phase 2 restores the open project's name here, resolved server-side through
 * the data-access layer.
 */
export function AppChrome({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const inProject = /^\/projects\/[^/]+/.test(pathname);

  return (
    <header className="sticky top-0 z-20 bg-surface-inverse text-on-inverse">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center rounded-lg py-1"
          aria-label="Mhandisi Makini — choose a project"
        >
          <Image
            src="/brand/logo-horizontal-reversed-notag.png"
            alt=""
            width={1600}
            height={561}
            priority
            className="h-9 w-auto"
          />
          <span className="sr-only">MHANDISI MAKINI</span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {inProject && (
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-white/40 px-3 py-2 text-sm font-bold text-on-inverse hover:bg-white/10"
            >
              Switch project
            </Link>
          )}
          <span className="hidden max-w-[16ch] truncate text-sm text-white/70 sm:block">
            {userEmail}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
