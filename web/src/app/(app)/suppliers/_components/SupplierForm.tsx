"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SupplierInput } from "@/lib/validation/registers";
import { Notice } from "@/components/ui/Notice";
import { useT } from "@/lib/i18n/client";

/**
 * The Supplier Register form (Slice 2.4b), shared by the new + edit routes.
 * `useActionState` for server-parsed errors; `noValidate` so validation is the
 * server's single source. The rich purchase-history profile (§25) is a later
 * slice — this is the directory record.
 */
export function SupplierForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<SupplierInput>;
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <Field label={t("suppliers.form.name")} required error={errors.name}>
          <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("suppliers.form.contactPerson")} error={errors.contactPerson}>
            <input
              name="contactPerson"
              defaultValue={initial?.contactPerson ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("suppliers.form.location")} error={errors.location}>
            <input
              name="location"
              defaultValue={initial?.location ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("suppliers.form.phone")} error={errors.phone}>
            <input
              name="phone"
              type="tel"
              defaultValue={initial?.phone ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("suppliers.form.email")} error={errors.email}>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field
          label={t("suppliers.form.paymentTerms")}
          hint={t("suppliers.form.paymentTermsHint")}
          error={errors.paymentTerms}
        >
          <input
            name="paymentTerms"
            defaultValue={initial?.paymentTerms ?? ""}
            className={controlClass}
          />
        </Field>
        <Field label={t("suppliers.form.status")} error={errors.status}>
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className={`${controlClass} cursor-pointer`}
          >
            <option value="active">{t("suppliers.form.active")}</option>
            <option value="inactive">{t("suppliers.form.inactive")}</option>
          </select>
        </Field>
        <Field label={t("suppliers.form.notes")} error={errors.notes}>
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
          {pending ? t("suppliers.form.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("suppliers.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
