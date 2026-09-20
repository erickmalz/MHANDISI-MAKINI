"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { ActionState } from "@/lib/forms/action-helpers";
import { Notice } from "@/components/ui/Notice";
import { useT } from "@/lib/i18n/client";

export function SaveAsTemplateForm({
  action,
  defaultName,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultName: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <Field label={t("closeout.saveAsTemplate.name")} required error={errors.name}>
          <input name="name" defaultValue={defaultName} className={controlClass} />
        </Field>
      </Card>

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? t("closeout.saveAsTemplate.saving") : t("closeout.saveAsTemplate.save")}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("closeout.saveAsTemplate.cancel")}
        </Button>
      </div>
    </form>
  );
}
