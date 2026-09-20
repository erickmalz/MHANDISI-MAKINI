"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SubcontractorInput } from "@/lib/validation/registers";
import { Notice } from "@/components/ui/Notice";
import { useT } from "@/lib/i18n/client";

/**
 * The Subcontractor Register form (Slice 2.4b), shared by the new + edit
 * routes. One Subcontractor is assigned per Task (Phase 1 decision 05).
 */
export function SubcontractorForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<SubcontractorInput>;
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("subcontractors.form.name")} required error={errors.name}>
            <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
          </Field>
          <Field
            label={t("subcontractors.form.trade")}
            hint={t("subcontractors.form.tradeHint")}
            error={errors.trade}
          >
            <input name="trade" defaultValue={initial?.trade ?? ""} className={controlClass} />
          </Field>
          <Field label={t("subcontractors.form.phone")} error={errors.phone}>
            <input
              name="phone"
              type="tel"
              defaultValue={initial?.phone ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("subcontractors.form.email")} error={errors.email}>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              className={controlClass}
            />
          </Field>
        </div>
        <Field label={t("subcontractors.form.address")} error={errors.address}>
          <input name="address" defaultValue={initial?.address ?? ""} className={controlClass} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label={t("subcontractors.form.status")} error={errors.status}>
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className={`${controlClass} cursor-pointer`}
          >
            <option value="active">{t("subcontractors.form.active")}</option>
            <option value="inactive">{t("subcontractors.form.inactive")}</option>
          </select>
        </Field>
        <Field label={t("subcontractors.form.notes")} error={errors.notes}>
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
          {pending ? t("subcontractors.form.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("subcontractors.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
