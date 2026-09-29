import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { getSupplierStatement } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale, getT, pageTitle } from "@/lib/i18n/server";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { REPORT_FILE_STEM } from "@/components/reports/filter-links";
import { hasActiveFilters, parseReportFilters } from "@/lib/reports/filters";
import { getReportFilterState } from "@/lib/reports/filter-state";

export const generateMetadata = pageTitle("suppliers.statement.pageTitle");

/**
 * The Supplier Statement (Operational Control decision 5) — an always-live,
 * all-time, all-project view: every Purchase Order raised against this
 * Supplier, every Payment made, and the running Outstanding balance. It leaves
 * the app as a dated Report Export (PDF / JPG / CSV) through the same toolbar
 * as the Reports (reports-toolbar ticket 07).
 */
export default async function SupplierStatementPage({
  params,
  searchParams,
}: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  const filters = parseReportFilters("supplier-statement", await searchParams);
  const [statement, filterState, t, locale] = await Promise.all([
    getSupplierStatement(id, filters),
    getReportFilterState("supplier-statement", id, filters),
    getT(),
    getLocale(),
  ]);
  if (!statement) notFound();
  const filtered = hasActiveFilters(filterState.filters);

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("suppliers.crumbProjects"), href: "/" }, { label: t("suppliers.crumbRegister"), href: "/suppliers" }]}
        title={statement.name}
        subtitle={t("suppliers.statement.subtitle")}
        actions={
          <>
            <Button variant="ghost" href={`/suppliers/${id}/edit`}>
              {t("suppliers.statement.editDetails")}
            </Button>
          </>
        }
      />

      <ReportToolbar
        state={filterState}
        scopeId={id}
        basePath={`/suppliers/${id}`}
        shareTitle={`${t("suppliers.statement.pageTitle")} — ${statement.name}`}
        fileStem={`${REPORT_FILE_STEM["supplier-statement"]}-${statement.name}`}
      />

      <Card className="mb-6 flex items-center justify-between">
        <span className="text-lg font-bold text-card-foreground">
          {t(filtered ? "suppliers.statement.outstandingFiltered" : "suppliers.statement.outstanding")}
        </span>
        <Money amount={statement.outstandingBalance} className="text-xl font-bold text-card-foreground" />
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-bold text-card-foreground">{t("suppliers.statement.orders")}</h2>
        {statement.orders.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            {t(filtered ? "reportToolbar.noMatch" : "suppliers.statement.noOrders")}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.orders.map((o) => (
              <li
                key={o.purchaseOrderId}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${o.projectId}/procurement/${o.purchaseOrderId}`}
                  className="min-w-0 hover:underline"
                >
                  <span className="font-bold text-card-foreground">
                    {o.displayNumber ?? t("suppliers.statement.draft")}
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {o.projectName} — {o.stageName}
                  </span>
                </Link>
                <Money amount={o.orderedTotal} className="font-bold text-card-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-card-foreground">{t("suppliers.statement.payments")}</h2>
        {statement.payments.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            {t(filtered ? "reportToolbar.noMatch" : "suppliers.statement.noPayments")}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${p.projectId}/procurement/${p.purchaseOrderId}`}
                  className="min-w-0 hover:underline"
                >
                  <span className="text-sm text-muted-foreground">{formatDate(p.paidOn, locale)}</span>{" "}
                  <span className="font-bold text-card-foreground">
                    {p.displayNumber ?? t("suppliers.statement.draft")}
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">— {p.projectName}</span>
                </Link>
                <Money amount={p.amount} className="font-bold text-card-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageFrame>
  );
}
