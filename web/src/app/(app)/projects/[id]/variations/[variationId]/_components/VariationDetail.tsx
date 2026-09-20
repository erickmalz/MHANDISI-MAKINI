"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { Variation } from "@/lib/variations";
import { isVariationDraft, isVariationFunded } from "@/lib/variations";
import { VariationStatusBadge } from "../../_components/VariationStatusBadge";
import { Notice } from "@/components/ui/Notice";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type PlainAction = () => Promise<void>;

/** Stored status of a linked funding request -> label. Unknown values show as stored. */
const LINKED_FR_STATUS: Record<string, MessageKey> = {
  draft: "funding.status.draft",
  issued: "funding.status.issued",
  superseded: "funding.status.superseded",
  cancelled: "funding.status.cancelled",
  closed: "funding.status.closed",
};

export function VariationDetail({
  projectId,
  variation,
  approveAction,
  rejectAction,
  cancelAction,
  deleteDraftAction,
}: {
  projectId: string;
  variation: Variation;
  approveAction: Bound;
  rejectAction: PlainAction;
  cancelAction: PlainAction;
  deleteDraftAction: PlainAction;
}) {
  const t = useT();
  const locale = useLocale();
  const draft = isVariationDraft(variation);
  const funded = isVariationFunded(variation);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-card-foreground">
            {variation.displayNumber ?? t("variations.detail.draftLabel")}
          </span>
          <VariationStatusBadge status={variation.status} />
          {funded && (
            <span className="rounded bg-health-green-bg px-2 py-0.5 text-sm font-bold text-health-green">
              {t("variations.detail.funded")}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("variations.detail.againstTask")}{" "}
          <span className="font-bold text-foreground">{variation.taskDescription}</span>
        </p>
        <p className="text-card-foreground">{variation.description}</p>
        {variation.reason && (
          <p className="text-sm text-muted-foreground">
            <span className="font-bold">{t("variations.detail.reason")} </span>
            {variation.reason}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <ImpactStat label={t("variations.detail.materialImpact")} amount={variation.materialImpact} />
          <ImpactStat label={t("variations.detail.labourImpact")} amount={variation.labourImpact} />
          <ImpactStat label={t("variations.detail.feeImpact")} amount={variation.feeImpact} />
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:grid-cols-2">
          <p>{t("variations.detail.requested", { date: formatDate(variation.requestedAt, locale) })}</p>
          {variation.approvedAt && (
            <p>
              {variation.clientReference
                ? t("variations.detail.approvedWithReference", {
                    date: formatDate(variation.approvedAt, locale),
                    reference: variation.clientReference,
                  })
                : t("variations.detail.approved", { date: formatDate(variation.approvedAt, locale) })}
            </p>
          )}
          {variation.rejectedAt && (
            <p>{t("variations.detail.rejected", { date: formatDate(variation.rejectedAt, locale) })}</p>
          )}
          {variation.cancelledAt && (
            <p>{t("variations.detail.cancelled", { date: formatDate(variation.cancelledAt, locale) })}</p>
          )}
        </div>

        {variation.notes && (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            {variation.notes}
          </p>
        )}
      </Card>

      {variation.fundingRequestLinks.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-card-foreground">
            {t("variations.detail.linkedFunding")}
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {variation.fundingRequestLinks.map((fr) => (
              <li key={fr.id}>
                <Link
                  href={`/projects/${projectId}/funding/${fr.id}`}
                  className="font-bold text-foreground hover:underline"
                >
                  {fr.displayNumber ?? t("variations.detail.draftLabel")}
                </Link>{" "}
                <span className="text-muted-foreground">
                  ({LINKED_FR_STATUS[fr.status] ? t(LINKED_FR_STATUS[fr.status]) : fr.status})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {draft && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" href={`/projects/${projectId}/variations/${variation.id}/edit`}>
              <PencilSimple size={16} aria-hidden="true" />
              {t("variations.detail.edit")}
            </Button>
            <PlainForm
              action={deleteDraftAction}
              label={t("variations.detail.discard")}
              variant="danger-quiet"
            />
          </div>

          <ApproveCard action={approveAction} />

          <div className="flex flex-wrap gap-3">
            <PlainForm action={rejectAction} label={t("variations.detail.reject")} variant="secondary" />
            <PlainForm action={cancelAction} label={t("variations.detail.cancel")} variant="danger-quiet" />
          </div>
        </>
      )}

      {variation.status === "approved" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            href={`/projects/${projectId}/funding/new?kind=additional&variationId=${variation.id}`}
          >
            {t("variations.detail.raiseFunding")}
          </Button>
          <PlainForm
            action={cancelAction}
            label={t("variations.detail.cancelThis")}
            variant="danger-quiet"
          />
        </div>
      )}
    </div>
  );
}

function ImpactStat({ label, amount }: { label: string; amount: number | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {amount != null && amount !== 0 ? (
        <Money amount={amount} className="font-bold text-card-foreground" />
      ) : (
        <p className="text-card-foreground">—</p>
      )}
    </div>
  );
}

function ApproveCard({ action }: { action: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-card-foreground">
          {t("variations.detail.approve.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("variations.detail.approve.body")}
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("variations.detail.approve.dateLabel")}
            hint={t("variations.detail.approve.dateHint")}
            error={errors.approvedAt}
          >
            <input name="approvedAt" type="date" className={controlClass} />
          </Field>
          <Field
            label={t("variations.detail.approve.referenceLabel")}
            hint={t("variations.detail.approve.referenceHint")}
            error={errors.clientReference}
          >
            <input name="clientReference" className={controlClass} />
          </Field>
        </div>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <div>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending
              ? t("variations.detail.approve.submitting")
              : t("variations.detail.approve.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PlainForm({
  action,
  label,
  variant,
}: {
  action: PlainAction;
  label: string;
  variant: "secondary" | "danger-quiet";
}) {
  return (
    <form action={action}>
      <Button variant={variant} type="submit">
        {label}
      </Button>
    </form>
  );
}
