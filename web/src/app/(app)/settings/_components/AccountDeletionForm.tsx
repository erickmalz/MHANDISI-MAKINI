"use client";

import { useActionState, useState } from "react";

import { requestAccountDeletionAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";

/**
 * Self-serve account deletion (Slice 2.8 Part 4 / ticket 02) — password
 * re-entry + typing the account email back (see
 * `accountDeletionInputSchema`'s doc comment for why the email, not an
 * arbitrary phrase). Collapsed behind a "Delete my account" toggle so the
 * destructive form isn't visible by default, matching the Danger Zone framing
 * elsewhere in the design system.
 *
 * When deletion is already scheduled, this renders the scheduled notice
 * instead of the form — there is deliberately no "cancel" button here: per
 * the ticket, signing back in is the one documented way to cancel, wired
 * through better-auth's session-create hook, not a settings action.
 *
 * `deleteAt` (not the raw `scheduledAt` + a client-side day count) is passed
 * in already computed by the Server Component: `GRACE_PERIOD_DAYS` lives in
 * the `server-only` `@/lib/data` barrel, which a `"use client"` file can't
 * import.
 */
export function AccountDeletionForm({
  email,
  deleteAt,
}: {
  email: string;
  deleteAt: Date | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(requestAccountDeletionAction, {});

  if (deleteAt) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-foreground">Account deletion scheduled</h2>
        <p className="text-sm text-muted-foreground">
          Your account and everything in it will be permanently deleted on{" "}
          <strong className="text-foreground">{formatDate(deleteAt)}</strong>.
          Sign back in at any time before then to cancel.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">Danger zone</h2>
      <p className="text-sm text-muted-foreground">
        Deleting your account schedules a permanent, irreversible deletion of
        every Project, financial record and document you own, 30 days from
        now. Export your data first if you want a copy.
      </p>

      {!expanded ? (
        <div>
          <Button variant="danger-quiet" type="button" onClick={() => setExpanded(true)}>
            Delete my account
          </Button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <Field label="Current password" required error={state.fieldErrors?.password}>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className={controlClass}
            />
          </Field>

          <Field
            label={`Type "${email}" to confirm`}
            required
            error={state.fieldErrors?.confirmEmail}
          >
            <input name="confirmEmail" autoComplete="off" className={controlClass} />
          </Field>

          {state.error && (
            <p className="text-sm font-bold text-destructive">{state.error}</p>
          )}

          <div className="flex gap-3">
            <Button variant="danger-quiet" type="submit" disabled={pending}>
              {pending ? "Scheduling…" : "Permanently delete my account"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
