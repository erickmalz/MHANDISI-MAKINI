"use client";

import { useActionState } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Notice } from "@/components/ui/Notice";
import type { ActionState } from "@/lib/forms/action-helpers";
import { useT } from "@/lib/i18n/client";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Record money received against an Issued Fee Invoice. The amount starts at
 * the full balance; lowering it records a part-payment and the invoice stays
 * open for the rest (CONTEXT.md "Fee Invoice").
 */
export function RecordFeePaymentForm({ balance, action }: { balance: number; action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="mb-6 flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">
        {t("feeInvoices.detail.recordPayment.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("feeInvoices.detail.recordPayment.body")}</p>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("feeInvoices.detail.recordPayment.amount")}
            required
            error={errors.amount}
          >
            <MoneyInput name="amount" defaultValue={balance} />
          </Field>
          <Field
            label={t("feeInvoices.detail.recordPayment.receivedOn")}
            required
            error={errors.receivedOn}
          >
            <input name="receivedOn" type="date" defaultValue={today} className={controlClass} />
          </Field>
          <Field
            label={t("feeInvoices.detail.recordPayment.method")}
            required
            error={errors.method}
          >
            <select
              name="method"
              defaultValue="bank_transfer"
              className={`${controlClass} cursor-pointer`}
            >
              <option value="bank_transfer">{t("funding.method.bankTransfer")}</option>
              <option value="mobile_money">{t("funding.method.mobileMoney")}</option>
              <option value="cheque">{t("funding.method.cheque")}</option>
              <option value="cash">{t("funding.method.cash")}</option>
              <option value="other">{t("funding.method.other")}</option>
            </select>
          </Field>
          <Field label={t("feeInvoices.detail.recordPayment.reference")} error={errors.reference}>
            <input name="reference" className={controlClass} />
          </Field>
        </div>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <div>
          <Button variant="primary" type="submit" disabled={pending}>
            <CheckCircle size={18} aria-hidden="true" />
            {pending
              ? t("feeInvoices.detail.recordPayment.submitting")
              : t("feeInvoices.detail.recordPayment.action")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
