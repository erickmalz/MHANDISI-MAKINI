"use client";

import { useActionState, useState } from "react";
import { CaretDown, CaretUp, Wallet } from "@phosphor-icons/react/dist/ssr";

import type { ActionState } from "@/lib/forms/action-helpers";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Notice } from "@/components/ui/Notice";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A quick "Record payment" toggle on a Task card in the Stage tasks list —
 * lets a payment be logged against a Task's labour agreement without
 * navigating to the Task edit page first. Posts through the same
 * `recordLabourPaymentAction` the Task edit form uses; only the `returnTo`
 * bound on it differs (back to this Stage page, not the Task edit page).
 */
export function RecordLabourPaymentButton({
  hasAgreement,
  action,
}: {
  hasAgreement: boolean;
  action: Bound;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  if (!hasAgreement) return null;

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <Wallet size={16} aria-hidden="true" />
        {t("stages.detail.task.recordPayment")}
        {open ? (
          <CaretUp size={14} aria-hidden="true" />
        ) : (
          <CaretDown size={14} aria-hidden="true" />
        )}
      </button>

      {open && (
        <form action={formAction} className="mt-3 flex flex-col gap-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("tasks.labour.record.amount")}
              required
              error={state.fieldErrors?.amount}
            >
              <MoneyInput name="amount" />
            </Field>
            <Field
              label={t("tasks.labour.record.paidOn")}
              required
              error={state.fieldErrors?.paidOn}
            >
              <input
                name="paidOn"
                type="date"
                defaultValue={today()}
                className={controlClass}
              />
            </Field>
            <Field
              label={t("tasks.labour.record.method")}
              required
              error={state.fieldErrors?.method}
            >
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
            <Field label={t("tasks.labour.record.reference")} error={state.fieldErrors?.reference}>
              <input name="reference" className={controlClass} />
            </Field>
          </div>
          <Field label={t("tasks.labour.record.notes")} error={state.fieldErrors?.notes}>
            <input name="notes" className={controlClass} />
          </Field>
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <div className="flex gap-2">
            <Button variant="secondary" type="submit" disabled={pending}>
              {pending ? t("tasks.labour.record.submitting") : t("tasks.labour.record.submit")}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {t("forms.common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
