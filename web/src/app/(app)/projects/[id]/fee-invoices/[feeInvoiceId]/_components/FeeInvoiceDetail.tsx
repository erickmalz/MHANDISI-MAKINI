import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { FeeInvoiceDetail as FeeInvoiceDetailModel } from "@/lib/data";
import type { ActionState } from "@/lib/forms/action-helpers";
import { formatTZS } from "@/lib/finance";
import { FeeInvoiceCorrections } from "./FeeInvoiceCorrections";
import { RecordFeePaymentForm } from "./RecordFeePaymentForm";

const METHOD_LABEL = {
  "Bank Transfer": "funding.method.bankTransfer",
  "Mobile Money": "funding.method.mobileMoney",
  Cheque: "funding.method.cheque",
  Cash: "funding.method.cash",
  Other: "funding.method.other",
} as const;

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A Fee Invoice's own page — the supervisor's ledger, separate from the
 * Funding Request that raised it (CONTEXT.md "Fee Invoice"). Lifecycle is
 * `issued → paid`, or `issued → void` when raised in error. While a balance is
 * owed it takes full or part payments; "Partially paid" is read off those
 * payments. Before any payment it can also have its amount corrected or be
 * voided, each with a recorded reason.
 */
export async function FeeInvoiceDetail({
  fi,
  projectId,
  paymentAction,
  correctAction,
  voidAction,
}: {
  fi: FeeInvoiceDetailModel;
  projectId: string;
  paymentAction: Bound;
  correctAction: Bound;
  voidAction: Bound;
}) {
  const t = await getT();
  const locale = await getLocale();
  const isPaid = fi.status === "paid";
  const isVoid = fi.status === "void";
  const isPartial = fi.status === "issued" && fi.amountReceived > 0;
  const balance = fi.feeAmount - fi.amountReceived;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{fi.stageName}</p>
          <h1 className="text-[1.75rem] font-bold text-foreground">{fi.displayNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={isPaid ? "success" : isVoid ? "danger" : isPartial ? "warning" : "info"}>
            {t(isPartial ? "feeInvoices.status.partiallyPaid" : `feeInvoices.status.${fi.status}`)}
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
        {!isVoid && (
          <>
            <StatTile label={t("feeInvoices.detail.received")} amount={fi.amountReceived} />
            <StatTile label={t("feeInvoices.detail.balance")} amount={balance} />
          </>
        )}
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

      {fi.payments.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-xl font-bold text-card-foreground">
            {t("feeInvoices.detail.payments.title")}
          </h2>
          <ul className="flex flex-col gap-3">
            {fi.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  <span className="font-bold text-card-foreground">
                    {p.method ? t(METHOD_LABEL[p.method]) : t("feeInvoices.detail.payments.marked")}
                  </span>
                  {p.reference && <span className="ml-2 text-muted-foreground">{p.reference}</span>}
                  <span className="ml-2 text-muted-foreground">{formatDate(p.receivedOn, locale)}</span>
                </span>
                <Money
                  amount={p.amount}
                  className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {fi.status === "issued" && <RecordFeePaymentForm balance={balance} action={paymentAction} />}

      {fi.status === "issued" && fi.amountReceived === 0 && (
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
