"use client";

import { useActionState } from "react";

import { addAdminAction, type AddAdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Field, controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

const initialState: AddAdminActionState = {};

export function AddAdminForm() {
  const [state, formAction, pending] = useActionState(addAdminAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-card-foreground">Add admin</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Email">
            <input type="email" name="email" required className={controlClass} />
          </Field>
        </div>
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
