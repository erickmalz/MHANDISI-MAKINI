"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { VariationDraftInput } from "@/lib/validation/variations";
import { Notice } from "@/components/ui/Notice";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useT } from "@/lib/i18n/client";

type TaskOption = { id: string; seq: number; description: string };

export function VariationForm({
  action,
  tasks,
  fixedTaskDescription,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Present on the create form — the engineer picks which Task this is against. */
  tasks?: TaskOption[];
  /** Present on the edit form — the task is shown, not re-picked. */
  fixedTaskDescription?: string;
  initial?: Partial<VariationDraftInput>;
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        {fixedTaskDescription ? (
          <>
            <input type="hidden" name="taskId" value={initial?.taskId ?? ""} />
            <p className="text-sm text-muted-foreground">
              {t("variations.form.task")}{" "}
              <span className="font-bold text-foreground">{fixedTaskDescription}</span> —{" "}
              {t("variations.form.taskFrozen")}
            </p>
          </>
        ) : (
          <Field label={t("variations.form.taskAgainst")} required error={errors.taskId}>
            <select
              name="taskId"
              defaultValue={initial?.taskId ?? tasks?.[0]?.id ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              {(tasks ?? []).map((task) => (
                <option key={task.id} value={task.id}>
                  {task.seq}. {task.description}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t("variations.form.scopeChange")} required error={errors.description}>
          <textarea
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            placeholder={t("variations.form.scopePlaceholder")}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <Field label={t("variations.form.reason")} error={errors.reason}>
          <textarea
            name="reason"
            rows={2}
            defaultValue={initial?.reason ?? ""}
            placeholder={t("variations.form.reasonPlaceholder")}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label={t("variations.form.materialImpact")}
            hint={t("variations.form.materialHint")}
            error={errors.materialImpact}
          >
            <MoneyInput
              name="materialImpact"
              defaultValue={initial?.materialImpact ?? ""}
              allowNegative
            />
          </Field>
          <Field
            label={t("variations.form.labourImpact")}
            hint={t("variations.form.labourHint")}
            error={errors.labourImpact}
          >
            <MoneyInput
              name="labourImpact"
              defaultValue={initial?.labourImpact ?? ""}
              allowNegative
            />
          </Field>
          <Field
            label={t("variations.form.feeImpact")}
            hint={t("variations.form.feeHint")}
            error={errors.feeImpact}
          >
            <MoneyInput
              name="feeImpact"
              defaultValue={initial?.feeImpact ?? ""}
              allowNegative
            />
          </Field>
        </div>

        <Field label={t("variations.form.notes")} error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-20`}
          />
        </Field>
      </Card>

      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? t("variations.form.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("variations.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
