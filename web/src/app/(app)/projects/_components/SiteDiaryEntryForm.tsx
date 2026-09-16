"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SiteDiaryEntryInput } from "@/lib/validation/site-diary";

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
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required error={errors.entryDate}>
            <input
              name="entryDate"
              type="date"
              defaultValue={initial?.entryDate ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Weather" error={errors.weather}>
            <input name="weather" defaultValue={initial?.weather ?? ""} className={controlClass} />
          </Field>
        </div>

        <Field label="Workers on site" error={errors.workersOnSite}>
          <input
            name="workersOnSite"
            type="number"
            min={0}
            defaultValue={initial?.workersOnSite ?? ""}
            className={controlClass}
          />
        </Field>

        <Field label="Main activities" error={errors.activities}>
          <textarea
            name="activities"
            rows={3}
            defaultValue={initial?.activities ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>

        <Field
          label="Materials received / used"
          hint="Materials received and major materials used, together as one note."
          error={errors.materialsUsed}
        >
          <textarea
            name="materialsUsed"
            rows={3}
            defaultValue={initial?.materialsUsed ?? ""}
            className={`${controlClass} min-h-24`}
          />
        </Field>

        <Field label="Equipment used" error={errors.equipmentUsed}>
          <textarea
            name="equipmentUsed"
            rows={2}
            defaultValue={initial?.equipmentUsed ?? ""}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Delays" error={errors.delays}>
            <textarea
              name="delays"
              rows={2}
              defaultValue={initial?.delays ?? ""}
              className={`${controlClass} min-h-16`}
            />
          </Field>
          <Field label="Issues" error={errors.issues}>
            <textarea
              name="issues"
              rows={2}
              defaultValue={initial?.issues ?? ""}
              className={`${controlClass} min-h-16`}
            />
          </Field>
        </div>

        <Field label="Instructions given" error={errors.instructions}>
          <textarea
            name="instructions"
            rows={2}
            defaultValue={initial?.instructions ?? ""}
            className={`${controlClass} min-h-16`}
          />
        </Field>

        <Field label="Visitors" error={errors.visitors}>
          <input name="visitors" defaultValue={initial?.visitors ?? ""} className={controlClass} />
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

      {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}

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
