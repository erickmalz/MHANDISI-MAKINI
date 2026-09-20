import Link from "next/link";
import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { listSubcontractors } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("subcontractors.pageTitle");

/**
 * The per-Account Subcontractor Register (guidelines §26). A Task is assigned
 * one subcontractor from here (Phase 1 decision 05).
 */
export default async function SubcontractorsPage() {
  const [subcontractors, t] = await Promise.all([listSubcontractors(), getT()]);

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("subcontractors.crumbProjects"), href: "/" }]}
        title={t("subcontractors.register")}
        subtitle={t("subcontractors.list.subtitle")}
        actions={
          <>
            <Button variant="primary" href="/subcontractors/new">
              <Plus size={20} aria-hidden="true" />
              {t("subcontractors.list.add")}
            </Button>
          </>
        }
      />

      {subcontractors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("subcontractors.list.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {subcontractors.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/subcontractors/${s.id}`}
                    className="font-bold text-card-foreground hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.trade && (
                    <StatusBadge tone="neutral" size="sm">
                      {s.trade}
                    </StatusBadge>
                  )}
                  {s.status === "inactive" && (
                    <StatusBadge tone="neutral" size="sm">
                      {t("subcontractors.list.inactive")}
                    </StatusBadge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {[s.phone, s.email, s.address].filter(Boolean).join(" · ") ||
                    t("subcontractors.list.noContact")}
                </p>
              </div>
              <Link
                href={`/subcontractors/${s.id}/edit`}
                className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <PencilSimple size={16} aria-hidden="true" />
                {t("subcontractors.list.edit")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
