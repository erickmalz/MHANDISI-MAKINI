import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { getSubcontractorStatement } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale, getT, pageTitle } from "@/lib/i18n/server";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { hasActiveFilters, parseReportFilters } from "@/lib/reports/filters";
import { getReportFilterState } from "@/lib/reports/filter-state";

export const generateMetadata = pageTitle("subcontractors.statement.pageTitle");

/**
 * The Subcontractor Statement (Operational Control decision 5) — an
 * always-live, all-time, all-project view: every Task this Subcontractor is
 * assigned, every labour Payment made, and the running Outstanding balance.
 * The "Variations" line from guidelines §Reports is omitted — Variations
 * don't exist until Phase 3. It leaves the app as a dated Report Export
 * (PDF / JPG / CSV) through the same toolbar as the Reports
 * (reports-toolbar ticket 07).
 */
export default async function SubcontractorStatementPage({
  params,
  searchParams,
}: PageProps<"/subcontractors/[id]">) {
  const { id } = await params;
  const filters = parseReportFilters("subcontractor-statement", await searchParams);
  const [statement, filterState, t, locale] = await Promise.all([
    getSubcontractorStatement(id, filters),
    getReportFilterState("subcontractor-statement", id, filters),
    getT(),
    getLocale(),
  ]);
  if (!statement) notFound();
  const filtered = hasActiveFilters(filterState.filters);

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("subcontractors.crumbProjects"), href: "/" }, { label: t("subcontractors.crumbRegister"), href: "/subcontractors" }]}
        title={statement.name}
        subtitle={t("subcontractors.statement.subtitle")}
        actions={
          <>
            <Button variant="ghost" href={`/subcontractors/${id}/edit`}>
              {t("subcontractors.statement.editDetails")}
            </Button>
          </>
        }
      />

      <ReportToolbar
        state={filterState}
        scopeId={id}
        basePath={`/subcontractors/${id}`}
        shareTitle={`${t("subcontractors.statement.pageTitle")} — ${statement.name}`}
        scopeLabel={statement.name}
      />

      <Card className="mb-6 flex items-center justify-between">
        <span className="text-lg font-bold text-card-foreground">
          {t(
            filtered
              ? "subcontractors.statement.outstandingFiltered"
              : "subcontractors.statement.outstanding",
          )}
        </span>
        <Money amount={statement.outstandingBalance} className="text-xl font-bold text-card-foreground" />
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-bold text-card-foreground">{t("subcontractors.statement.agreedLabour")}</h2>
        {statement.tasks.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            {t(filtered ? "reportToolbar.noMatch" : "subcontractors.statement.noTasks")}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.tasks.map((task) => (
              <li
                key={task.taskId}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${task.projectId}/tasks/${task.taskId}/edit`}
                  className="min-w-0 hover:underline"
                >
                  <span className="font-bold text-card-foreground">{task.description}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {task.projectName} — {task.stageName}
                  </span>
                </Link>
                <Money amount={task.agreedAmount} className="font-bold text-card-foreground" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-card-foreground">{t("subcontractors.statement.payments")}</h2>
        {statement.payments.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            {t(filtered ? "reportToolbar.noMatch" : "subcontractors.statement.noPayments")}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {statement.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/projects/${p.projectId}/tasks/${p.taskId}/edit`}
                  className="min-w-0 hover:underline"
                >
                  <span className="text-sm text-muted-foreground">{formatDate(p.paidOn, locale)}</span>{" "}
                  <span className="font-bold text-card-foreground">{p.taskDescription}</span>{" "}
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
