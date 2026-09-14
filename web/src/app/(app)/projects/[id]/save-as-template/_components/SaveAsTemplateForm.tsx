"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";

export function SaveAsTemplateForm({
  action,
  defaultName,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultName: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <Field label="Template name" required error={errors.name}>
          <input name="name" defaultValue={defaultName} className={controlClass} />
        </Field>
      </Card>

      {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
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
