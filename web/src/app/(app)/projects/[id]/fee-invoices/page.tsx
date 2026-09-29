import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

import { getProjectOverview, listFeeInvoices, type FeeInvoiceListItem } from "@/lib/data";
import { Money } from "@/components/ui/Money";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { getLocale, getT, pageTitle } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/locales";

export const generateMetadata = pageTitle("feeInvoices.pageTitle");

export default async function FeeInvoicesPage({
  params,
}: PageProps<"/projects/[id]/fee-invoices">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const [invoices, t, locale] = await Promise.all([
    listFeeInvoices(project.id),
    getT(),
    getLocale(),
  ]);

  return (
    <PageFrame width="working">
      <PageHeader
        title={t("feeInvoices.pageTitle")}
        subtitle={t("feeInvoices.list.subtitle")}
      />

      {invoices.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          {t("feeInvoices.list.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((fi) => (
            <FeeInvoiceRow
              key={fi.id}
              projectId={project.id}
              fi={fi}
              t={t}
              locale={locale}
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function FeeInvoiceRow({
  projectId,
  fi,
  t,
  locale,
}: {
  projectId: string;
  fi: FeeInvoiceListItem;
  t: Translator;
  locale: Locale;
}) {
  return (
    <Link
      href={`/projects/${projectId}/fee-invoices/${fi.id}`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-card-foreground">{fi.displayNumber}</span>
          <StatusBadge
            tone={fi.status === "paid" ? "success" : fi.status === "void" ? "danger" : "info"}
            size="sm"
          >
            {t(`feeInvoices.status.${fi.status}`)}
          </StatusBadge>
          {fi.isDelta && (
            <StatusBadge tone="neutral" size="sm">
              {t("feeInvoices.list.delta")}
            </StatusBadge>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {t("feeInvoices.list.forRequest", {
            stage: fi.stageName,
            number: fi.fundingRequestDisplayNumber ?? "",
          })}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <Money
          amount={fi.feeAmount}
          className={`shrink-0 whitespace-nowrap font-bold ${
            fi.status === "void" ? "text-muted-foreground line-through" : "text-card-foreground"
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {t(fi.status === "paid" ? "feeInvoices.detail.paidOn" : "feeInvoices.detail.issuedOn", {
            date: formatDate(fi.status === "paid" && fi.paidAt ? fi.paidAt : fi.issuedAt, locale),
          })}
        </span>
      </div>
      <CaretRight
        size={18}
        className="hidden shrink-0 text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}
