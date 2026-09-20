"use client";

import { useActionState } from "react";
import { CheckCircle, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { LineField } from "@/components/ui/LineField";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Notice } from "@/components/ui/Notice";
import { formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { ActionState } from "@/lib/forms/action-helpers";
import { outstandingLabour, type LabourPayment } from "@/lib/tasks";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Payment method values as stored → label key. Unknown values show as stored. */
const METHOD_KEYS: Record<string, MessageKey> = {
  bank_transfer: "tasks.labour.methods.bankTransfer",
  mobile_money: "tasks.labour.methods.mobileMoney",
  cheque: "tasks.labour.methods.cheque",
  cash: "tasks.labour.methods.cash",
  other: "tasks.labour.methods.other",
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The labour-payment write UI on a Task's edit page — mirrors the Purchase
 * Order Supplier Payments card (`PaymentsCard` in
 * `projects/[id]/procurement/[poId]/_components/PurchaseOrderDetail.tsx`):
 * every payment (voided ones marked, not hidden), a void-with-reason form per
 * live payment, and a record-payment form when the task has an agreement.
 */
export function LabourPaymentsCard({
  labourAmount,
  payments,
  paymentAction,
  voidActions,
}: {
  labourAmount: number | undefined;
  payments: LabourPayment[];
  paymentAction: Bound;
  voidActions: Record<string, Bound>;
}) {
  const t = useT();
  const locale = useLocale();
  const canRecord = labourAmount != null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-card-foreground">{t("tasks.labour.title")}</h2>
        {canRecord && (
          <span className="text-sm text-muted-foreground">
            {t("tasks.labour.outstanding")}{" "}
            <Money
              amount={outstandingLabour(labourAmount, payments)}
              className="font-bold text-card-foreground"
            />
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("tasks.labour.none")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {payments.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border border-border p-3 text-sm ${p.voidedAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-bold text-card-foreground">
                    {METHOD_KEYS[p.method] ? t(METHOD_KEYS[p.method]) : p.method}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {p.reference && `${p.reference} · `}
                    {formatDate(p.paidOn, locale)}
                  </span>
                </span>
                <Money
                  amount={p.amount}
                  className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${p.voidedAt ? "line-through" : ""}`}
                />
              </div>
              {p.notes && <p className="mt-1 text-muted-foreground">{p.notes}</p>}
              {p.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  {p.voidReason
                    ? t("tasks.labour.voidedWithReason", { reason: p.voidReason })
                    : t("tasks.labour.voided")}
                </p>
              ) : (
                <VoidForm action={voidActions[p.id]} label={t("tasks.labour.voidPayment")} />
              )}
            </li>
          ))}
        </ul>
      )}

      {canRecord ? (
        <div className="mt-5 border-t border-border pt-4">
          <RecordPaymentForm action={paymentAction} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("tasks.labour.needAgreement")}
        </p>
      )}
    </Card>
  );
}

function RecordPaymentForm({ action }: { action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h3 className="font-bold text-card-foreground">{t("tasks.labour.record.title")}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("tasks.labour.record.amount")} required error={errors.amount}>
          <MoneyInput name="amount" />
        </Field>
        <Field label={t("tasks.labour.record.paidOn")} required error={errors.paidOn}>
          <input
            name="paidOn"
            type="date"
            defaultValue={today()}
            className={controlClass}
          />
        </Field>
        <Field label={t("tasks.labour.record.method")} required error={errors.method}>
          <select
            name="method"
            defaultValue="mobile_money"
            className={`${controlClass} cursor-pointer`}
          >
            <option value="bank_transfer">{t("tasks.labour.methods.bankTransfer")}</option>
            <option value="mobile_money">{t("tasks.labour.methods.mobileMoney")}</option>
            <option value="cheque">{t("tasks.labour.methods.cheque")}</option>
            <option value="cash">{t("tasks.labour.methods.cash")}</option>
            <option value="other">{t("tasks.labour.methods.other")}</option>
          </select>
        </Field>
        <Field label={t("tasks.labour.record.reference")} error={errors.reference}>
          <input name="reference" className={controlClass} />
        </Field>
      </div>
      <Field label={t("tasks.labour.record.notes")} error={errors.notes}>
        <input name="notes" className={controlClass} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending ? t("tasks.labour.record.submitting") : t("tasks.labour.record.submit")}
        </Button>
      </div>
    </form>
  );
}

function VoidForm({ action, label }: { action: Bound; label: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <LineField label={t("tasks.labour.void.reason")} className="flex-1">
        <input
          name="reason"
          aria-label={t("tasks.labour.void.aria")}
          className="min-h-12 rounded-lg border border-control-border bg-card px-2 py-1 text-sm"
        />
      </LineField>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
      >
        <Trash size={14} aria-hidden="true" />
        {label}
      </button>
      {(state.fieldErrors?.reason || state.error) && (
        <Notice tone="error" className="w-full">
          {state.fieldErrors?.reason ?? state.error}
        </Notice>
      )}
    </form>
  );
}
