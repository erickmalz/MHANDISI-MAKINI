"use client";

import { useActionState } from "react";
import { PencilSimple, Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Notice } from "@/components/ui/Notice";
import type { ActionState } from "@/lib/forms/action-helpers";
import { useT } from "@/lib/i18n/client";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * The two ways to fix an unpaid Fee Invoice, each with a required reason: amend
 * its amount under the same number, or void it outright. Neither is offered
 * once the invoice is paid (CONTEXT.md "Fee Invoice").
 */
export function FeeInvoiceCorrections({
  feeAmount,
  correctAction,
  voidAction,
}: {
  feeAmount: number;
  correctAction: Bound;
  voidAction: Bound;
}) {
  return (
    <div className="mb-6 flex flex-col gap-6">
      <CorrectCard feeAmount={feeAmount} action={correctAction} />
      <VoidCard action={voidAction} />
    </div>
  );
}

function CorrectCard({ feeAmount, action }: { feeAmount: number; action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">
        {t("feeInvoices.detail.correct.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("feeInvoices.detail.correct.body")}</p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field label={t("feeInvoices.detail.correct.amount")} required error={errors.amount}>
          <MoneyInput name="amount" defaultValue={feeAmount} />
        </Field>
        <Field label={t("feeInvoices.detail.correct.reason")} required error={errors.reason}>
          <textarea name="reason" rows={2} className={controlClass} />
        </Field>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            <PencilSimple size={18} aria-hidden="true" />
            {pending
              ? t("feeInvoices.detail.correct.submitting")
              : t("feeInvoices.detail.correct.action")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function VoidCard({ action }: { action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">
        {t("feeInvoices.detail.void.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("feeInvoices.detail.void.body")}</p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field label={t("feeInvoices.detail.void.reason")} required error={errors.reason}>
          <textarea name="reason" rows={2} className={controlClass} />
        </Field>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <div>
          <Button variant="danger-quiet" type="submit" disabled={pending}>
            <Prohibit size={18} aria-hidden="true" />
            {pending ? t("feeInvoices.detail.void.submitting") : t("feeInvoices.detail.void.action")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
