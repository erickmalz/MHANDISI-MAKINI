"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { VariationDraftInput } from "@/lib/validation/variations";

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
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        {fixedTaskDescription ? (
          <>
            <input type="hidden" name="taskId" value={initial?.taskId ?? ""} />
            <p className="text-sm text-muted-foreground">
              Task <span className="font-bold text-foreground">{fixedTaskDescription}</span>{" "}
              — frozen with this Variation.
            </p>
          </>
        ) : (
          <Field label="Task this Variation is against" required error={errors.taskId}>
            <select
              name="taskId"
              defaultValue={initial?.taskId ?? tasks?.[0]?.id ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              {(tasks ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.seq}. {t.description}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Scope change" required error={errors.description}>
          <textarea
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            placeholder="e.g. Additional room added to the ground floor plan"
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <Field label="Reason" error={errors.reason}>
          <textarea
            name="reason"
            rows={2}
            defaultValue={initial?.reason ?? ""}
            placeholder="Why the client asked for, or agreed to, this change"
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Material impact (TZS)"
            hint="A reduction can be entered as a negative amount."
            error={errors.materialImpact}
          >
            <input
              name="materialImpact"
              type="number"
              defaultValue={initial?.materialImpact ?? ""}
              className={controlClass}
            />
          </Field>
          <Field
            label="Labour impact (TZS)"
            hint="Revises the task's labour agreement once Approved."
            error={errors.labourImpact}
          >
            <input
              name="labourImpact"
              type="number"
              defaultValue={initial?.labourImpact ?? ""}
              className={controlClass}
            />
          </Field>
          <Field
            label="Fee impact (TZS)"
            hint="A carried note — key it into the Additional Funding Request's own fee line by hand."
            error={errors.feeImpact}
          >
            <input
              name="feeImpact"
              type="number"
              defaultValue={initial?.feeImpact ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label="Notes" error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-20`}
          />
        </Field>
      </Card>

      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-12 items-center px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
