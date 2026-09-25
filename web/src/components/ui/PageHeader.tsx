import type { ReactNode } from "react";

import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/**
 * The header every screen opens with: ancestors (breadcrumbs), the page title,
 * an optional line of context, and the page's actions. Keep to ONE primary
 * (yellow) action in `actions`; everything else is secondary or quiet.
 */
export function PageHeader({
  crumbs,
  title,
  subtitle,
  meta,
  actions,
}: {
  /** Ancestors only — not the current page. Omit on a top-level tab. */
  crumbs?: Crumb[];
  title: ReactNode;
  subtitle?: ReactNode;
  /** A badge or two shown beside the title (status, health). */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {crumbs && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="mm-page-title font-bold text-foreground">{title}</h1>
            {meta}
          </div>
          {subtitle && <div className="mt-1 max-w-prose text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
