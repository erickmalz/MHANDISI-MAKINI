"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  PaperPlaneTilt,
  Trash,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/forms/action-helpers";
import {
  type FundingRequest,
  type FundingRequestLine,
  deriveFRStatus,
  depositTarget,
  depositedTotal,
  depositOutstanding,
  feeSubtotal,
} from "@/lib/funding";
import { FRStatusBadge } from "../../_components/FRStatusBadge";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function FundingRequestDetail({
  fr,
  projectId,
  issueAction,
  issueError,
  supersedeAction,
  depositAction,
  discardAction,
  editHref,
  voidActions,
}: {
  fr: FundingRequest;
  projectId: string;
  issueAction: () => Promise<void>;
  issueError?: string;
  supersedeAction: Bound;
  depositAction: Bound;
  discardAction: () => Promise<void>;
  editHref: string;
  voidActions: Record<string, Bound>;
}) {
  const status = deriveFRStatus(fr);
  const isDraft = fr.status === "draft";
  const canRevise = fr.status === "issued" && !fr.supersededByDisplayNumber;
  const canDeposit = ["issued", "superseded", "closed"].includes(fr.status);

  const target = depositTarget(fr);
  const deposited = depositedTotal(fr);
  const outstanding = depositOutstanding(fr);
  const fee = feeSubtotal(fr);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {fr.projectName} &middot; {fr.stageName}
          </p>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            {fr.displayNumber ?? "Draft funding request"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {fr.clientName}
            {fr.kind === "additional" && " · additional request"}
          </p>
        </div>
        <FRStatusBadge status={status} />
      </header>

      {isDraft && (
        <p className="mb-6 rounded-lg border border-border-strong bg-muted p-3 text-sm text-muted-foreground">
          This request is still a draft. Issuing it freezes the lines and totals,
          assigns its number, and raises the stage&apos;s Fee Invoice.
        </p>
      )}
      {fr.supersedesDisplayNumber && (
        <p className="mb-6 rounded-lg bg-health-amber-bg p-3 text-sm text-health-amber">
          Revises {fr.supersedesDisplayNumber}
          {fr.revisionReason ? ` — ${fr.revisionReason}` : ""}.
        </p>
      )}
      {fr.supersededByDisplayNumber && (
        <p className="mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Superseded by {fr.supersededByDisplayNumber}. This version still renders
          its own frozen content and keeps any deposits recorded against it.
        </p>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Requested" amount={target} emphasis />
        <Stat label="Deposited" amount={deposited} />
        <Stat
          label="Outstanding"
          amount={outstanding}
          tone={outstanding > 0 ? "destructive" : undefined}
        />
        <Stat label="Supervision fee" amount={fee} />
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-card-foreground">Lines</h2>
          {isDraft && (
            <Link
              href={editHref}
              className="text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Edit draft
            </Link>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <LineSection title="Materials" lines={fr.lines.filter((l) => l.category === "material")} />
          <LineSection title="Labour" lines={fr.lines.filter((l) => l.category === "labour")} />
          <LineSection title="Other" lines={fr.lines.filter((l) => l.category === "other")} />
          {fee > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
              <span>Supervision fee — billed separately via Fee Invoice</span>
              <Money amount={fee} className="shrink-0 whitespace-nowrap" />
            </div>
          )}
        </div>
        {(fr.paymentInstructions || fr.notes) && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
            {fr.paymentInstructions && <p>{fr.paymentInstructions}</p>}
            {fr.notes && <p>{fr.notes}</p>}
          </div>
        )}
        {fr.issuedAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            Issued {formatDate(fr.issuedAt)}
            {fr.feeInvoice && (
              <>
                {" "}
                &middot; Fee Invoice {fr.feeInvoice.displayNumber} (
                {fr.feeInvoice.status === "paid" ? "paid" : "issued"}
                {fr.feeInvoice.isDelta ? ", delta" : ""})
              </>
            )}
          </p>
        )}
      </Card>

      {!isDraft && fr.displayNumber && (
        <div className="mb-6">
          <DocumentDownloads
            links={[
              {
                label: `Funding request ${fr.displayNumber}`,
                pdfHref: `/projects/${projectId}/funding/${fr.id}/document.pdf`,
                jpgHref: `/projects/${projectId}/funding/${fr.id}/document.jpg`,
              },
              ...(fr.feeInvoice
                ? [
                    {
                      label: `Fee Invoice ${fr.feeInvoice.displayNumber}`,
                      pdfHref: `/projects/${projectId}/funding/${fr.id}/fee-invoice.pdf`,
                      jpgHref: `/projects/${projectId}/funding/${fr.id}/fee-invoice.jpg`,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}

      {isDraft ? (
        <DraftActions
          issueAction={issueAction}
          issueError={issueError}
          discardAction={discardAction}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <DepositsCard
            fr={fr}
            canDeposit={canDeposit}
            depositAction={depositAction}
            voidActions={voidActions}
          />
          {canRevise && <SupersedeCard supersedeAction={supersedeAction} />}
          <Link
            href={`/projects/${projectId}/funding`}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
          >
            Back to all funding requests
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

function DraftActions({
  issueAction,
  issueError,
  discardAction,
}: {
  issueAction: () => Promise<void>;
  issueError?: string;
  discardAction: () => Promise<void>;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">Issue to client</h2>
      <p className="text-sm text-muted-foreground">
        This freezes the request and cannot be undone — a later correction is
        made by issuing a revised version.
      </p>
      {issueError && (
        <p className="text-sm font-bold text-destructive">{issueError}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <form action={issueAction}>
          <Button variant="primary" type="submit">
            <PaperPlaneTilt size={18} aria-hidden="true" />
            Issue to client
          </Button>
        </form>
        <form action={discardAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline rounded-md transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
          >
            Discard draft
          </button>
        </form>
      </div>
    </Card>
  );
}

function DepositsCard({
  fr,
  canDeposit,
  depositAction,
  voidActions,
}: {
  fr: FundingRequest;
  canDeposit: boolean;
  depositAction: Bound;
  voidActions: Record<string, Bound>;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">Deposits</h2>
      {fr.deposits.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No deposits recorded yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {fr.deposits.map((d) => (
            <li
              key={d.id}
              className={`rounded-lg border border-border p-3 text-sm ${d.voidedAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-bold text-card-foreground">{d.method}</span>
                  {d.reference && (
                    <span className="ml-2 text-muted-foreground">{d.reference}</span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    {formatDate(d.receivedOn)}
                  </span>
                </span>
                <Money
                  amount={d.amount}
                  className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${d.voidedAt ? "line-through" : ""}`}
                />
              </div>
              {d.notes && (
                <p className="mt-1 text-muted-foreground">{d.notes}</p>
              )}
              {d.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  Voided{d.voidReason ? ` — ${d.voidReason}` : ""}
                </p>
              ) : (
                <VoidDepositForm action={voidActions[d.id]} />
              )}
            </li>
          ))}
        </ul>
      )}

      {canDeposit && (
        <div className="mt-5 border-t border-border pt-4">
          <RecordDepositForm action={depositAction} />
        </div>
      )}
    </Card>
  );
}

function RecordDepositForm({ action }: { action: Bound }) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h3 className="font-bold text-card-foreground">Record a deposit</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (TZS)" required error={errors.amount}>
          <input name="amount" type="number" min={1} className={controlClass} />
        </Field>
        <Field label="Received on" required error={errors.receivedOn}>
          <input
            name="receivedOn"
            type="date"
            defaultValue={today}
            className={controlClass}
          />
        </Field>
        <Field label="Method" required error={errors.method}>
          <select name="method" defaultValue="bank_transfer" className={`${controlClass} cursor-pointer`}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Reference" error={errors.reference}>
          <input name="reference" className={controlClass} />
        </Field>
      </div>
      <Field label="Notes" error={errors.notes}>
        <input name="notes" className={controlClass} />
      </Field>
      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending ? "Recording…" : "Record deposit"}
        </Button>
      </div>
    </form>
  );
}

function VoidDepositForm({ action }: { action: Bound }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        name="reason"
        placeholder="Reason to void"
        aria-label="Reason to void this deposit"
        className="min-h-10 flex-1 rounded-lg border border-border-strong bg-card px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-md transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
      >
        <Trash size={14} aria-hidden="true" />
        Void
      </button>
      {(state.fieldErrors?.reason || state.error) && (
        <span className="w-full text-sm font-bold text-destructive">
          {state.fieldErrors?.reason ?? state.error}
        </span>
      )}
    </form>
  );
}

function SupersedeCard({ supersedeAction }: { supersedeAction: Bound }) {
  const [state, formAction, pending] = useActionState(supersedeAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">Revise this request</h2>
      <p className="text-sm text-muted-foreground">
        An issued request is never edited in place. This starts a new version
        (carrying the current lines) that supersedes this one when you issue it.
      </p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field label="Why is it being revised?" required error={errors.revisionReason}>
          <input name="revisionReason" className={controlClass} />
        </Field>
        {state.error && (
          <p className="text-sm font-bold text-destructive">{state.error}</p>
        )}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? "Starting…" : "Start a revision"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LineSection({
  title,
  lines,
}: {
  title: string;
  lines: FundingRequestLine[];
}) {
  if (lines.length === 0) return null;
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      <ul className="mt-1 flex flex-col divide-y divide-border">
        {lines.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="text-card-foreground">{l.item}</span>
              {l.qty != null && (
                <span className="block text-muted-foreground">
                  {l.qty} {l.unit ?? ""} × {(l.unitCost ?? 0).toLocaleString("en-US")}
                </span>
              )}
            </span>
            <Money
              amount={l.amount}
              className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
            />
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{title} subtotal</span>
        <Money amount={subtotal} className="font-bold text-card-foreground" />
      </div>
    </div>
  );
}

function Stat({
  label,
  amount,
  emphasis,
  tone,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  tone?: "destructive";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Money
        amount={amount}
        className={`whitespace-nowrap font-bold ${
          tone === "destructive" ? "text-destructive" : "text-card-foreground"
        } ${emphasis ? "text-xl" : "text-lg"}`}
        negativeClassName={`whitespace-nowrap font-bold text-destructive ${emphasis ? "text-xl" : "text-lg"}`}
      />
    </div>
  );
}
