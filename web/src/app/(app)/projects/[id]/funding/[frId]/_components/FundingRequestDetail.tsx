"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  PaperPlaneTilt,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { ActionState } from "@/lib/forms/action-helpers";
import {
  type FundingRequest,
  type FundingRequestLine,
  deriveFRStatus,
  depositTarget,
  depositedTotal,
  depositOutstanding,
  feeSubtotal,
  type PaymentMethod,
} from "@/lib/funding";
import { FRStatusBadge } from "../../_components/FRStatusBadge";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const METHOD_LABEL: Record<PaymentMethod, MessageKey> = {
  "Bank Transfer": "funding.method.bankTransfer",
  "Mobile Money": "funding.method.mobileMoney",
  Cheque: "funding.method.cheque",
  Cash: "funding.method.cash",
  Other: "funding.method.other",
};

export function FundingRequestDetail({
  fr,
  projectId,
  issueAction,
  issueError,
  supersedeAction,
  depositAction,
  discardAction,
  editHref,
  voidActions,
}: {
  fr: FundingRequest;
  projectId: string;
  issueAction: () => Promise<void>;
  issueError?: string;
  supersedeAction: Bound;
  depositAction: Bound;
  discardAction: () => Promise<void>;
  editHref: string;
  voidActions: Record<string, Bound>;
}) {
  const t = useT();
  const locale = useLocale();
  const status = deriveFRStatus(fr);
  const isDraft = fr.status === "draft";
  const canRevise = fr.status === "issued" && !fr.supersededByDisplayNumber;
  const canDeposit = ["issued", "superseded", "closed"].includes(fr.status);

  const target = depositTarget(fr);
  const deposited = depositedTotal(fr);
  const outstanding = depositOutstanding(fr);
  const fee = feeSubtotal(fr);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {fr.projectName} &middot; {fr.stageName}
          </p>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            {fr.displayNumber ?? t("funding.detail.draftTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {fr.kind === "additional"
              ? t("funding.detail.additionalRequest", { client: fr.clientName })
              : fr.clientName}
          </p>
        </div>
        <FRStatusBadge status={status} />
      </header>

      {isDraft && (
        <p className="mb-6 rounded-lg border border-border-strong bg-muted p-3 text-sm text-muted-foreground">
          {t("funding.detail.draftNotice")}
        </p>
      )}
      {fr.supersedesDisplayNumber && (
        <p className="mb-6 rounded-lg bg-health-amber-bg p-3 text-sm font-bold text-foreground">
          {fr.revisionReason
            ? t("funding.detail.revisesWithReason", {
                number: fr.supersedesDisplayNumber,
                reason: fr.revisionReason,
              })
            : t("funding.detail.revises", { number: fr.supersedesDisplayNumber })}
        </p>
      )}
      {fr.supersededByDisplayNumber && (
        <p className="mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {t("funding.detail.supersededBy", { number: fr.supersededByDisplayNumber })}
        </p>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t("funding.detail.requested")} amount={target} emphasis />
        <Stat label={t("funding.detail.deposited")} amount={deposited} />
        <Stat
          label={t("funding.detail.outstanding")}
          amount={outstanding}
          tone={outstanding > 0 ? "destructive" : undefined}
        />
        <Stat label={t("funding.detail.supervisionFee")} amount={fee} />
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-card-foreground">{t("funding.detail.lines")}</h2>
          {isDraft && (
            <Button variant="ghost" href={editHref}>
              {t("funding.detail.editDraft")}
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <LineSection title={t("funding.detail.materials")} lines={fr.lines.filter((l) => l.category === "material")} />
          <LineSection title={t("funding.detail.labour")} lines={fr.lines.filter((l) => l.category === "labour")} />
          <LineSection title={t("funding.detail.other")} lines={fr.lines.filter((l) => l.category === "other")} />
          {fee > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
              <span>{t("funding.detail.feeLine")}</span>
              <Money amount={fee} className="shrink-0 whitespace-nowrap" />
            </div>
          )}
        </div>
        {(fr.paymentInstructions || fr.notes) && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
            {fr.paymentInstructions && <p>{fr.paymentInstructions}</p>}
            {fr.notes && <p>{fr.notes}</p>}
          </div>
        )}
        {fr.issuedAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            {fr.feeInvoice
              ? t("funding.detail.issuedWithInvoice", {
                  date: formatDate(fr.issuedAt, locale),
                  number: fr.feeInvoice.displayNumber,
                  state: t(
                    fr.feeInvoice.status === "void"
                      ? "funding.detail.invoiceState.void"
                      : fr.feeInvoice.status === "paid"
                      ? fr.feeInvoice.isDelta
                        ? "funding.detail.invoiceState.paidDelta"
                        : "funding.detail.invoiceState.paid"
                      : fr.feeInvoice.isDelta
                        ? "funding.detail.invoiceState.issuedDelta"
                        : "funding.detail.invoiceState.issued",
                  ),
                })
              : t("funding.detail.issuedOn", { date: formatDate(fr.issuedAt, locale) })}
          </p>
        )}
      </Card>

      {!isDraft && fr.displayNumber && (
        <div className="mb-6">
          <DocumentDownloads
            links={[
              {
                label: t("funding.detail.documentRequest", { number: fr.displayNumber }),
                pdfHref: `/projects/${projectId}/funding/${fr.id}/document.pdf`,
                jpgHref: `/projects/${projectId}/funding/${fr.id}/document.jpg`,
              },
              ...(fr.feeInvoice
                ? [
                    {
                      label: t("funding.detail.documentFeeInvoice", {
                        number: fr.feeInvoice.displayNumber,
                      }),
                      pdfHref: `/projects/${projectId}/funding/${fr.id}/fee-invoice.pdf`,
                      jpgHref: `/projects/${projectId}/funding/${fr.id}/fee-invoice.jpg`,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {isDraft ? (
        <DraftActions
          issueAction={issueAction}
          issueError={issueError}
          discardAction={discardAction}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <DepositsCard
            fr={fr}
            canDeposit={canDeposit}
            depositAction={depositAction}
            voidActions={voidActions}
          />
          {canRevise && <SupersedeCard supersedeAction={supersedeAction} />}
          <Link
            href={`/projects/${projectId}/funding`}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
          >
            {t("funding.detail.backToAll")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

function DraftActions({
  issueAction,
  issueError,
  discardAction,
}: {
  issueAction: () => Promise<void>;
  issueError?: string;
  discardAction: () => Promise<void>;
}) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">{t("funding.detail.issue.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("funding.detail.issue.warning")}
      </p>
      {issueError && (
        <Notice tone="error">{issueError}</Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <form action={issueAction}>
          <Button variant="primary" type="submit">
            <PaperPlaneTilt size={18} aria-hidden="true" />
            {t("funding.detail.issue.action")}
          </Button>
        </form>
        <form action={discardAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
          >
            {t("funding.detail.issue.discard")}
          </button>
        </form>
      </div>
    </Card>
  );
}

function DepositsCard({
  fr,
  canDeposit,
  depositAction,
  voidActions,
}: {
  fr: FundingRequest;
  canDeposit: boolean;
  depositAction: Bound;
  voidActions: Record<string, Bound>;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{t("funding.detail.deposits.title")}</h2>
      {fr.deposits.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("funding.detail.deposits.none")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {fr.deposits.map((d) => (
            <li
              key={d.id}
              className={`rounded-lg border border-border p-3 text-sm ${d.voidedAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-bold text-card-foreground">
                    {METHOD_LABEL[d.method] ? t(METHOD_LABEL[d.method]) : d.method}
                  </span>
                  {d.reference && (
                    <span className="ml-2 text-muted-foreground">{d.reference}</span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    {formatDate(d.receivedOn, locale)}
                  </span>
                </span>
                <Money
                  amount={d.amount}
                  className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${d.voidedAt ? "line-through" : ""}`}
                />
              </div>
              {d.notes && (
                <p className="mt-1 text-muted-foreground">{d.notes}</p>
              )}
              {d.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  {d.voidReason
                    ? t("funding.detail.deposits.voidedWithReason", { reason: d.voidReason })
                    : t("funding.detail.deposits.voided")}
                </p>
              ) : (
                <VoidDepositForm action={voidActions[d.id]} />
              )}
            </li>
          ))}
        </ul>
      )}

      {canDeposit && (
        <div className="mt-5 border-t border-border pt-4">
          <RecordDepositForm action={depositAction} />
        </div>
      )}
    </Card>
  );
}

function RecordDepositForm({ action }: { action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h3 className="font-bold text-card-foreground">{t("funding.detail.record.title")}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("funding.detail.record.amount")} required error={errors.amount}>
          <MoneyInput name="amount" />
        </Field>
        <Field label={t("funding.detail.record.receivedOn")} required error={errors.receivedOn}>
          <input
            name="receivedOn"
            type="date"
            defaultValue={today}
            className={controlClass}
          />
        </Field>
        <Field label={t("funding.detail.record.method")} required error={errors.method}>
          <select name="method" defaultValue="bank_transfer" className={`${controlClass} cursor-pointer`}>
            <option value="bank_transfer">{t("funding.method.bankTransfer")}</option>
            <option value="mobile_money">{t("funding.method.mobileMoney")}</option>
            <option value="cheque">{t("funding.method.cheque")}</option>
            <option value="cash">{t("funding.method.cash")}</option>
            <option value="other">{t("funding.method.other")}</option>
          </select>
        </Field>
        <Field label={t("funding.detail.record.reference")} error={errors.reference}>
          <input name="reference" className={controlClass} />
        </Field>
      </div>
      <Field label={t("funding.detail.record.notes")} error={errors.notes}>
        <input name="notes" className={controlClass} />
      </Field>
      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending ? t("funding.detail.record.submitting") : t("funding.detail.record.submit")}
        </Button>
      </div>
    </form>
  );
}

function VoidDepositForm({ action }: { action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <LineField label={t("funding.detail.void.reason")} className="flex-1">
        <input
          name="reason"
          aria-label={t("funding.detail.void.reasonAria")}
          className="min-h-12 rounded-lg border border-control-border bg-card px-2 py-1 text-sm"
        />
      </LineField>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
      >
        <Trash size={14} aria-hidden="true" />
        {t("funding.detail.void.action")}
      </button>
      {(state.fieldErrors?.reason || state.error) && (
        <Notice tone="error" className="w-full">
          {state.fieldErrors?.reason ?? state.error}
        </Notice>
      )}
    </form>
  );
}

function SupersedeCard({ supersedeAction }: { supersedeAction: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(supersedeAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">{t("funding.detail.revise.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("funding.detail.revise.body")}
      </p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field label={t("funding.detail.revise.why")} required error={errors.revisionReason}>
          <input name="revisionReason" className={controlClass} />
        </Field>
        {state.error && (
          <Notice tone="error">{state.error}</Notice>
        )}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? t("funding.detail.revise.starting") : t("funding.detail.revise.start")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LineSection({
  title,
  lines,
}: {
  title: string;
  lines: FundingRequestLine[];
}) {
  const t = useT();
  if (lines.length === 0) return null;
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      <ul className="mt-1 flex flex-col divide-y divide-border">
        {lines.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="text-card-foreground">{l.item}</span>
              {l.qty != null && (
                <span className="block text-muted-foreground">
                  {l.qty} {l.unit ?? ""} × {(l.unitCost ?? 0).toLocaleString("en-US")}
                </span>
              )}
            </span>
            <Money
              amount={l.amount}
              className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
            />
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {t("funding.detail.subtotal", { section: title })}
        </span>
        <Money amount={subtotal} className="font-bold text-card-foreground" />
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  emphasis,
  tone,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  tone?: "destructive";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Money
        amount={amount}
        className={`whitespace-nowrap font-bold ${
          tone === "destructive" ? "text-destructive" : "text-card-foreground"
        } ${emphasis ? "text-xl" : "text-lg"}`}
        negativeClassName={`whitespace-nowrap font-bold text-destructive ${emphasis ? "text-xl" : "text-lg"}`}
      />
    </div>
  );
}
