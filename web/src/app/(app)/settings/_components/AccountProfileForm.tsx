"use client";

import { useActionState } from "react";

import { updateAccountProfileAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import type { AccountProfileInput } from "@/lib/validation/account";

/**
 * Name/phone edit, following `ProjectForm`'s shape (Slice 2.4a). Email is
 * shown for context but is not a form field — it isn't submitted, and isn't
 * part of `accountProfileInputSchema` (ticket 02: changing it needs an
 * out-of-scope verification-link flow).
 */
export function AccountProfileForm({
  initial,
  email,
}: {
  initial: AccountProfileInput;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(updateAccountProfileAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-foreground">Profile</h2>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <Field label="Email" hint="Your sign-in email. Contact support to change it.">
          <input value={email} disabled readOnly className={`${controlClass} opacity-70`} />
        </Field>

        <Field label="Full name" required error={errors.fullName}>
          <input name="fullName" defaultValue={initial.fullName} className={controlClass} />
        </Field>

        <Field label="Phone" required error={errors.phone}>
          <input
            name="phone"
            type="tel"
            defaultValue={initial.phone}
            className={controlClass}
          />
        </Field>

        {state.error && (
          <p className="text-sm font-bold text-destructive">{state.error}</p>
        )}

        <div>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
