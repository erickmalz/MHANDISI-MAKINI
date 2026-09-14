"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { Variation } from "@/lib/variations";
import { isVariationDraft, isVariationFunded } from "@/lib/variations";
import { VariationStatusBadge } from "../../_components/VariationStatusBadge";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type PlainAction = () => Promise<void>;

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
  const draft = isVariationDraft(variation);
  const funded = isVariationFunded(variation);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-card-foreground">
            {variation.displayNumber ?? "Draft"}
          </span>
          <VariationStatusBadge status={variation.status} />
          {funded && (
            <span className="rounded bg-health-green-bg px-2 py-0.5 text-xs font-bold text-health-green">
              Funded
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Against task <span className="font-bold text-foreground">{variation.taskDescription}</span>
        </p>
        <p className="text-card-foreground">{variation.description}</p>
        {variation.reason && (
          <p className="text-sm text-muted-foreground">
            <span className="font-bold">Reason: </span>
            {variation.reason}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <ImpactStat label="Material impact" amount={variation.materialImpact} />
          <ImpactStat label="Labour impact" amount={variation.labourImpact} />
          <ImpactStat label="Fee impact (note only)" amount={variation.feeImpact} />
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:grid-cols-2">
          <p>Requested {formatDate(variation.requestedAt)}</p>
          {variation.approvedAt && (
            <p>
              Approved {formatDate(variation.approvedAt)}
              {variation.clientReference && ` — ${variation.clientReference}`}
            </p>
          )}
          {variation.rejectedAt && <p>Rejected {formatDate(variation.rejectedAt)}</p>}
          {variation.cancelledAt && <p>Cancelled {formatDate(variation.cancelledAt)}</p>}
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
            Linked Additional Funding Requests
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {variation.fundingRequestLinks.map((fr) => (
              <li key={fr.id}>
                <Link
                  href={`/projects/${projectId}/funding/${fr.id}`}
                  className="font-bold text-foreground hover:underline"
                >
                  {fr.displayNumber ?? "Draft"}
                </Link>{" "}
                <span className="text-muted-foreground">({fr.status})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {draft && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${projectId}/variations/${variation.id}/edit`}
              className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <PencilSimple size={16} aria-hidden="true" />
              Edit
            </Link>
            <PlainForm action={deleteDraftAction} label="Discard draft" variant="danger-quiet" />
          </div>

          <ApproveCard action={approveAction} />

          <div className="flex flex-wrap gap-3">
            <PlainForm action={rejectAction} label="Reject" variant="secondary" />
            <PlainForm action={cancelAction} label="Cancel" variant="danger-quiet" />
          </div>
        </>
      )}

      {variation.status === "approved" && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            href={`/projects/${projectId}/funding/new?kind=additional&variationId=${variation.id}`}
          >
            Raise Additional Funding Request
          </Button>
          <PlainForm action={cancelAction} label="Cancel this Variation" variant="danger-quiet" />
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
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-card-foreground">Approve</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Records the client&rsquo;s real-world sign-off and mints this
          Variation&rsquo;s number. Revises the task&rsquo;s labour agreement
          and appends a material take-off line for the impacts above — this
          cannot be undone by editing.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Approval date"
            hint="Defaults to today if left blank."
            error={errors.approvedAt}
          >
            <input name="approvedAt" type="date" className={controlClass} />
          </Field>
          <Field
            label="Client reference"
            hint="A WhatsApp confirmation, a signed change-order sheet number…"
            error={errors.clientReference}
          >
            <input name="clientReference" className={controlClass} />
          </Field>
        </div>
        {state.error && <p className="text-sm font-bold text-destructive">{state.error}</p>}
        <div>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Approving…" : "Approve variation"}
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
