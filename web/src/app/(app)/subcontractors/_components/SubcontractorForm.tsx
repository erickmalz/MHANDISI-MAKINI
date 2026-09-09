"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SubcontractorInput } from "@/lib/validation/registers";

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
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Subcontractor name" required error={errors.name}>
            <input name="name" defaultValue={initial?.name ?? ""} className={controlClass} />
          </Field>
          <Field
            label="Trade"
            hint="Mason, carpenter, steel-fixer, electrician…"
            error={errors.trade}
          >
            <input name="trade" defaultValue={initial?.trade ?? ""} className={controlClass} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              name="phone"
              type="tel"
              defaultValue={initial?.phone ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
              className={controlClass}
            />
          </Field>
        </div>
        <Field label="Address" error={errors.address}>
          <input name="address" defaultValue={initial?.address ?? ""} className={controlClass} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label="Status" error={errors.status}>
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className={`${controlClass} cursor-pointer`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive — hide from new task assignments</option>
          </select>
        </Field>
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
