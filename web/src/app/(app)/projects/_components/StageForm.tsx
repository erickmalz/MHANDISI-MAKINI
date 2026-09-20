"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { StageInput } from "@/lib/validation/structure";
import { Notice } from "@/components/ui/Notice";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import { STAGE_DB_STATUS_KEYS } from "./status-keys";

const STATUSES: { value: StageInput["status"]; labelKey: MessageKey }[] = (
  Object.keys(STAGE_DB_STATUS_KEYS) as (keyof typeof STAGE_DB_STATUS_KEYS)[]
).map((value) => ({ value, labelKey: STAGE_DB_STATUS_KEYS[value] }));

export function StageForm({
  action,
  initial,
  seq,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<StageInput>;
  seq?: number;
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const [feeBasis, setFeeBasis] = useState<string>(initial?.feeBasis ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        {seq != null && (
          <p className="text-sm text-muted-foreground">
            {t("forms.stage.seqNote", { seq })}
          </p>
        )}

        <Field label={t("forms.stage.name")} required error={errors.name}>
          <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("forms.common.status")} error={errors.status}>
            <select
              name="status"
              defaultValue={initial?.status ?? "planned"}
              className={`${controlClass} cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("forms.common.progressPercent")} error={errors.progressPercent}>
            <input
              name="progressPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={initial?.progressPercent ?? 0}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label={t("forms.stage.feeBasis.label")} error={errors.feeBasis}>
          <select
            name="feeBasis"
            value={feeBasis}
            onChange={(e) => setFeeBasis(e.target.value)}
            className={`${controlClass} cursor-pointer`}
          >
            <option value="">{t("forms.stage.feeBasis.notSet")}</option>
            <option value="fixed">{t("forms.stage.feeBasis.fixed")}</option>
            <option value="percent">{t("forms.stage.feeBasis.percent")}</option>
          </select>
        </Field>

        {feeBasis === "fixed" && (
          <Field label={t("forms.stage.fixedFee")} required error={errors.feeAmount}>
            <MoneyInput
              name="feeAmount"
              defaultValue={initial?.feeAmount ?? ""}
            />
          </Field>
        )}
        {feeBasis === "percent" && (
          <Field label={t("forms.stage.feePercent")} required error={errors.feePercent}>
            <input
              name="feePercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={initial?.feePercent ?? ""}
              className={controlClass}
            />
          </Field>
        )}
        {/* Keep the inactive fee input in the form body so its name always posts. */}
        {feeBasis !== "fixed" && <input type="hidden" name="feeAmount" value="" />}
        {feeBasis !== "percent" && <input type="hidden" name="feePercent" value="" />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("forms.common.startedOn")} error={errors.startedOn}>
            <input
              name="startedOn"
              type="date"
              defaultValue={initial?.startedOn ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("forms.common.completedOn")} error={errors.completedOn}>
            <input
              name="completedOn"
              type="date"
              defaultValue={initial?.completedOn ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label={t("forms.common.notes")} error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>
      </Card>

      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? t("forms.common.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("forms.common.cancel")}
        </Button>
      </div>
    </form>
  );
}
