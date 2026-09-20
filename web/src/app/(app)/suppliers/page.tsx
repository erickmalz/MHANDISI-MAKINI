import Link from "next/link";
import { PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import { listSuppliers } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("suppliers.pageTitle");

/**
 * The per-Account Supplier Register (guidelines §25). Reference data reused
 * across every project — a Purchase Order names a supplier from here.
 */
export default async function SuppliersPage() {
  const [suppliers, t] = await Promise.all([listSuppliers(), getT()]);

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("suppliers.crumbProjects"), href: "/" }]}
        title={t("suppliers.register")}
        subtitle={t("suppliers.list.subtitle")}
        actions={
          <>
            <Button variant="primary" href="/suppliers/new">
              <Plus size={20} aria-hidden="true" />
              {t("suppliers.list.add")}
            </Button>
          </>
        }
      />

      {suppliers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("suppliers.list.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/suppliers/${s.id}`}
                    className="font-bold text-card-foreground hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.status === "inactive" && (
                    <StatusBadge tone="neutral" size="sm">
                      {t("suppliers.list.inactive")}
                    </StatusBadge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {[s.contactPerson, s.phone, s.location].filter(Boolean).join(" · ") ||
                    t("suppliers.list.noContact")}
                </p>
              </div>
              <Link
                href={`/suppliers/${s.id}/edit`}
                className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <PencilSimple size={16} aria-hidden="true" />
                {t("suppliers.list.edit")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
