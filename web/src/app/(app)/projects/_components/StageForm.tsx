"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { StageInput } from "@/lib/validation/structure";

const STATUSES: { value: StageInput["status"]; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "awaiting_funding", label: "Awaiting funding" },
  { value: "on_hold", label: "On hold" },
  { value: "ready_for_closeout", label: "Ready for closeout" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const [feeBasis, setFeeBasis] = useState<string>(initial?.feeBasis ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        {seq != null && (
          <p className="text-sm text-muted-foreground">
            Stage <span className="font-bold text-foreground">{seq}</span> in the
            project sequence.
          </p>
        )}

        <Field label="Stage name" required error={errors.name}>
          <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" error={errors.status}>
            <select
              name="status"
              defaultValue={initial?.status ?? "planned"}
              className={`${controlClass} cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Progress (%)" error={errors.progressPercent}>
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
        <Field label="Supervision fee basis" error={errors.feeBasis}>
          <select
            name="feeBasis"
            value={feeBasis}
            onChange={(e) => setFeeBasis(e.target.value)}
            className={`${controlClass} cursor-pointer`}
          >
            <option value="">Not set yet</option>
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percentage of stage cost</option>
          </select>
        </Field>

        {feeBasis === "fixed" && (
          <Field label="Fixed fee (TZS)" required error={errors.feeAmount}>
            <input
              name="feeAmount"
              type="number"
              min={0}
              defaultValue={initial?.feeAmount ?? ""}
              className={controlClass}
            />
          </Field>
        )}
        {feeBasis === "percent" && (
          <Field label="Fee percentage" required error={errors.feePercent}>
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
          <Field label="Started on" error={errors.startedOn}>
            <input
              name="startedOn"
              type="date"
              defaultValue={initial?.startedOn ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Completed on" error={errors.completedOn}>
            <input
              name="completedOn"
              type="date"
              defaultValue={initial?.completedOn ?? ""}
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
