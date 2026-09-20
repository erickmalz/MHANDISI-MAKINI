"use client";

import { useActionState, useState } from "react";

import { requestAccountDeletionAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";
import { Notice } from "@/components/ui/Notice";
import { useLocale, useT } from "@/lib/i18n/client";

/** Bolds `fragment` inside `text` without splitting the translated sentence into pieces. */
function emphasise(text: string, fragment: string) {
  const [before, ...rest] = text.split(fragment);
  if (rest.length === 0) return text;
  return (
    <>
      {before}
      <strong className="text-foreground">{fragment}</strong>
      {rest.join(fragment)}
    </>
  );
}

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
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(requestAccountDeletionAction, {});

  if (deleteAt) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-foreground">{t("settings.deletion.scheduledTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {emphasise(
            t("settings.deletion.scheduledBody", { date: formatDate(deleteAt, locale) }),
            formatDate(deleteAt, locale),
          )}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">{t("settings.deletion.dangerTitle")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("settings.deletion.dangerBody")}
      </p>

      {!expanded ? (
        <div>
          <Button variant="danger-quiet" type="button" onClick={() => setExpanded(true)}>
            {t("settings.deletion.delete")}
          </Button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <Field label={t("settings.deletion.currentPassword")} required error={state.fieldErrors?.password}>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className={controlClass}
            />
          </Field>

          <Field
            label={t("settings.deletion.confirmLabel", { email })}
            required
            error={state.fieldErrors?.confirmEmail}
          >
            <input name="confirmEmail" autoComplete="off" className={controlClass} />
          </Field>

          {state.error && (
            <Notice tone="error">{state.error}</Notice>
          )}

          <div className="flex gap-3">
            <Button variant="danger-quiet" type="submit" disabled={pending}>
              {pending ? t("settings.deletion.scheduling") : t("settings.deletion.confirm")}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setExpanded(false)}>
              {t("settings.deletion.cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
