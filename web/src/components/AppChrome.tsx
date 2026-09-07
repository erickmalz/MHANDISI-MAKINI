"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProject } from "@/lib/mock-data";

/** Routes that present their own full-bleed brand treatment. */
const BARE_ROUTES = ["/welcome", "/sign-in"];

/**
 * The shared charcoal app header — brand chrome on every working screen.
 *
 * The engineer works one project at a time. When a project is open the header
 * names it and offers a way back to the picker; everywhere else it is just the
 * brand mark. The header is charcoal, so it carries the reversed horizontal
 * lockup directly (yellow hard hat, near-white gear and wordmark) — the
 * supplied artwork, never retyped as text. The tagline is dropped at this size
 * (the "-notag" asset), per the brand rule to omit it rather than let it become
 * unreadable.
 */
export function AppChrome() {
  const pathname = usePathname();
  if (BARE_ROUTES.includes(pathname)) return null;

  const match = pathname.match(/^\/projects\/([^/]+)/);
  const project = match ? getProject(match[1]) : undefined;

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

        {project && (
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <span className="hidden min-w-0 truncate text-sm text-white/70 md:block">
              {project.name}
            </span>
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-white/40 px-3 py-2 text-sm font-bold text-on-inverse hover:bg-white/10"
            >
              Switch project
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
