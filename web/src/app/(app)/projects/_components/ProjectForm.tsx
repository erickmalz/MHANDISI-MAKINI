"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { ProjectInput } from "@/lib/validation/structure";

const ESTIMATE_MODELS: { value: ProjectInput["estimateModel"]; label: string }[] = [
  { value: "budget", label: "Budget — client pays actual material cost" },
  { value: "fixed_price", label: "Fixed price — client pays the estimate" },
];

const STATUSES: { value: ProjectInput["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectForm({
  action,
  initial,
  projectCode,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<ProjectInput>;
  projectCode?: string;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        {projectCode && (
          <p className="text-sm text-muted-foreground">
            Project number <span className="font-bold text-foreground">{projectCode}</span>{" "}
            — assigned on creation and fixed.
          </p>
        )}

        <Field label="Project name" required error={errors.name}>
          <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client name" required error={errors.clientName}>
            <input
              name="clientName"
              defaultValue={initial?.clientName ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Site" required error={errors.site}>
            <input name="site" defaultValue={initial?.site ?? ""} className={controlClass} />
          </Field>
          <Field label="Client phone" error={errors.clientPhone}>
            <input
              name="clientPhone"
              type="tel"
              defaultValue={initial?.clientPhone ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Client email" error={errors.clientEmail}>
            <input
              name="clientEmail"
              type="email"
              defaultValue={initial?.clientEmail ?? ""}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Estimate model" error={errors.estimateModel}>
            <select
              name="estimateModel"
              defaultValue={initial?.estimateModel ?? "budget"}
              className={`${controlClass} cursor-pointer`}
            >
              {ESTIMATE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select
              name="status"
              defaultValue={initial?.status ?? "active"}
              className={`${controlClass} cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Started on" error={errors.startedOn}>
            <input
              name="startedOn"
              type="date"
              defaultValue={initial?.startedOn ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Expected completion" error={errors.expectedCompletionOn}>
            <input
              name="expectedCompletionOn"
              type="date"
              defaultValue={initial?.expectedCompletionOn ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label="Notes" error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-24`}
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
