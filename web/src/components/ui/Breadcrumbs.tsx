"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

import { useT } from "@/lib/i18n/client";

export type Crumb = { label: string; href: string };

/**
 * The trail of ancestors above the page title. The current page is the `h1`
 * right below, so it is not repeated here. Links keep a 48px target.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const t = useT();
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label={t("common.breadcrumb")} className="mb-1">
      <ol className="flex flex-wrap items-center">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center">
            {i > 0 && (
              <CaretRight
                size={14}
                aria-hidden="true"
                className="mx-1 shrink-0 text-muted-foreground"
              />
            )}
            <Link
              href={crumb.href}
              className="inline-flex min-h-12 items-center rounded-lg px-1 text-sm font-bold text-muted-foreground hover:text-foreground hover:underline"
            >
              {crumb.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
