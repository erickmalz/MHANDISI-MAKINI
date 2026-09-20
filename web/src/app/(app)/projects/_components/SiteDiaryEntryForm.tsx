"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SiteDiaryEntryInput } from "@/lib/validation/site-diary";
import { Notice } from "@/components/ui/Notice";
import { useT } from "@/lib/i18n/client";

/**
 * Shared create/edit form for a Site Diary entry (Phase 4 Slice 4.1, ticket
 * 01) — mirrors `StageForm`'s shape. Every §30 field is optional except the
 * date; a supervisor filling this in from a phone at day's end can leave
 * any section blank.
 */
export function SiteDiaryEntryForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<SiteDiaryEntryInput>;
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
          <Field label={t("forms.diary.date")} required error={errors.entryDate}>
            <input
              name="entryDate"
              type="date"
              defaultValue={initial?.entryDate ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("forms.diary.weather")} error={errors.weather}>
            <input name="weather" defaultValue={initial?.weather ?? ""} className={controlClass} />
          </Field>
        </div>

        <Field label={t("forms.diary.workersOnSite")} error={errors.workersOnSite}>
          <input
            name="workersOnSite"
            type="number"
            min={0}
            defaultValue={initial?.workersOnSite ?? ""}
            className={controlClass}
          />
        </Field>

        <Field label={t("forms.diary.activities")} error={errors.activities}>
          <textarea
            name="activities"
            rows={3}
            defaultValue={initial?.activities ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>

        <Field
          label={t("forms.diary.materials")}
          hint={t("forms.diary.materialsHint")}
          error={errors.materialsUsed}
        >
          <textarea
            name="materialsUsed"
            rows={3}
            defaultValue={initial?.materialsUsed ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>

        <Field label={t("forms.diary.equipment")} error={errors.equipmentUsed}>
          <textarea
            name="equipmentUsed"
            rows={2}
            defaultValue={initial?.equipmentUsed ?? ""}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("forms.diary.delays")} error={errors.delays}>
            <textarea
              name="delays"
              rows={2}
              defaultValue={initial?.delays ?? ""}
              className={`${controlClass} min-h-16`}
            />
          </Field>
          <Field label={t("forms.diary.issues")} error={errors.issues}>
            <textarea
              name="issues"
              rows={2}
              defaultValue={initial?.issues ?? ""}
              className={`${controlClass} min-h-16`}
            />
          </Field>
        </div>

        <Field label={t("forms.diary.instructions")} error={errors.instructions}>
          <textarea
            name="instructions"
            rows={2}
            defaultValue={initial?.instructions ?? ""}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <Field label={t("forms.diary.visitors")} error={errors.visitors}>
          <input name="visitors" defaultValue={initial?.visitors ?? ""} className={controlClass} />
        </Field>

        <Field label={t("forms.common.notes")} error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>
      </Card>

      {state.error && <Notice tone="error">{state.error}</Notice>}

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
