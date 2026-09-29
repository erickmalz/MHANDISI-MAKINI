import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { FeeInvoiceDetail as FeeInvoiceDetailModel } from "@/lib/data";
import type { ActionState } from "@/lib/forms/action-helpers";
import { formatTZS } from "@/lib/finance";
import { FeeInvoiceCorrections } from "./FeeInvoiceCorrections";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A Fee Invoice's own page — the supervisor's ledger, separate from the
 * Funding Request that raised it (CONTEXT.md "Fee Invoice"). Lifecycle is
 * `issued → paid`, or `issued → void` when raised in error. While unpaid it can
 * be marked paid, have its amount corrected, or be voided — the last two with
 * a recorded reason.
 */
export async function FeeInvoiceDetail({
  fi,
  projectId,
  markPaidAction,
  correctAction,
  voidAction,
}: {
  fi: FeeInvoiceDetailModel;
  projectId: string;
  markPaidAction: () => Promise<void>;
  correctAction: Bound;
  voidAction: Bound;
}) {
  const t = await getT();
  const locale = await getLocale();
  const isPaid = fi.status === "paid";
  const isVoid = fi.status === "void";

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{fi.stageName}</p>
          <h1 className="text-[1.75rem] font-bold text-foreground">{fi.displayNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={isPaid ? "success" : isVoid ? "danger" : "info"}>
            {t(`feeInvoices.status.${fi.status}`)}
          </StatusBadge>
          {fi.isDelta && <StatusBadge tone="neutral">{t("feeInvoices.list.delta")}</StatusBadge>}
        </div>
      </header>

      {fi.isDelta && (
        <p className="mb-6 rounded-lg bg-health-amber-bg p-3 text-sm font-bold text-foreground">
          {t("feeInvoices.detail.delta")}
        </p>
      )}

      {isVoid && (
        <p className="mb-6 rounded-lg bg-health-red-bg p-3 text-sm text-foreground">
          <span className="font-bold">
            {t("feeInvoices.detail.voidedOn", {
              date: formatDate(fi.voidedAt ?? fi.issuedAt, locale),
            })}
          </span>{" "}
          {fi.voidReason}
        </p>
      )}

      {fi.originalFeeAmount != null && fi.correctedAt && (
        <p className="mb-6 rounded-lg bg-muted p-3 text-sm text-foreground">
          <span className="font-bold">
            {t("feeInvoices.detail.correctedOn", {
              date: formatDate(fi.correctedAt, locale),
              amount: formatTZS(fi.originalFeeAmount),
            })}
          </span>{" "}
          {fi.correctionReason}
        </p>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label={t("feeInvoices.detail.amount")} amount={fi.feeAmount} emphasis />
        {fi.feeBasis === "percent" && fi.basisValue != null && (
          <StatTile label={t("feeInvoices.detail.stageValue")} amount={fi.basisValue} />
        )}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{t("feeInvoices.detail.basis")}</span>
          <span className="whitespace-nowrap font-bold text-card-foreground">
            {fi.feeBasis === "percent" && fi.feePercent != null
              ? t("feeInvoices.detail.basisPercent", { percent: Number(fi.feePercent) })
              : t("feeInvoices.detail.basisFixed")}
          </span>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("feeInvoices.detail.fundingRequest")}</span>
            <Link
              href={`/projects/${projectId}/funding/${fi.fundingRequestId}`}
              className="font-bold text-foreground underline"
            >
              {fi.fundingRequestDisplayNumber}
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {t(isPaid ? "feeInvoices.detail.paidOn" : "feeInvoices.detail.issuedOn", {
                date: formatDate(isPaid && fi.paidAt ? fi.paidAt : fi.issuedAt, locale),
              })}
            </span>
          </div>
        </div>
        {fi.paymentInstructions && (
          <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
            <p className="mb-1 font-bold text-card-foreground">
              {t("feeInvoices.detail.paymentInstructions")}
            </p>
            <p>{fi.paymentInstructions}</p>
          </div>
        )}
      </Card>

      <div className="mb-6">
        <DocumentDownloads
          links={[
            {
              label: t("feeInvoices.detail.document", { number: fi.displayNumber }),
              pdfHref: `/projects/${projectId}/funding/${fi.fundingRequestId}/fee-invoice.pdf`,
              jpgHref: `/projects/${projectId}/funding/${fi.fundingRequestId}/fee-invoice.jpg`,
            },
          ]}
        />
      </div>

      {fi.status === "issued" && (
        <Card className="mb-6 flex flex-col gap-3">
          <h2 className="text-xl font-bold text-card-foreground">
            {t("feeInvoices.detail.markPaid.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("feeInvoices.detail.markPaid.body")}</p>
          <form action={markPaidAction}>
            <Button variant="primary" type="submit">
              <CheckCircle size={18} aria-hidden="true" />
              {t("feeInvoices.detail.markPaid.action")}
            </Button>
          </form>
        </Card>
      )}

      {fi.status === "issued" && (
        <FeeInvoiceCorrections
          feeAmount={fi.feeAmount}
          correctAction={correctAction}
          voidAction={voidAction}
        />
      )}

      <Link
        href={`/projects/${projectId}/fee-invoices`}
        className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
      >
        {t("feeInvoices.detail.backToAll")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
