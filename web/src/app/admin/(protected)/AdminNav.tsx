"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; match: (pathname: string) => boolean }[] = [
  {
    href: "/admin",
    label: "Accounts",
    match: (p) => p === "/admin" || p.startsWith("/admin/accounts"),
  },
  {
    href: "/admin/admins",
    label: "Admins",
    match: (p) => p.startsWith("/admin/admins"),
  },
  {
    href: "/admin/activity",
    label: "Activity",
    match: (p) => p.startsWith("/admin/activity"),
  },
];

/**
 * Nav links for the charcoal admin header. The active section is marked
 * with more than colour — a charcoal-800 wash, bold weight and
 * `aria-current="page"` — per the design system's nav rule (SKILL.md §4
 * Navigation: "the active item has a `--mm-charcoal-800` background ... and
 * `aria-current='page'`"). A client component so `usePathname` is available
 * while `AdminLayout` itself stays a server component for the auth check.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-12 items-center rounded-lg px-3 text-sm transition-colors ${
              active
                ? "bg-[var(--mm-charcoal-hover)] font-bold text-on-inverse"
                : "font-semibold text-on-inverse/80 hover:bg-white/10 hover:text-on-inverse"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
