"use client";

import { useActionState, useState } from "react";
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
  type PurchaseOrder,
  acceptedValue,
  derivePOStatus,
  orderedTotal,
  outstandingValue,
  paidTotal,
} from "@/lib/procurement";
import { POStatusBadge } from "../../_components/POStatusBadge";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const today = () => new Date().toISOString().slice(0, 10);

export function PurchaseOrderDetail({
  po,
  projectId,
  issueAction,
  issueError,
  discardAction,
  editHref,
  deliveryAction,
  paymentAction,
  ackAction,
  cancelAction,
  closeAction,
  reopenAction,
  voidDeliveryActions,
  voidPaymentActions,
}: {
  po: PurchaseOrder;
  projectId: string;
  issueAction: () => Promise<void>;
  issueError?: string;
  discardAction: () => Promise<void>;
  editHref: string;
  deliveryAction: Bound;
  paymentAction: Bound;
  ackAction: Bound;
  cancelAction: Bound;
  closeAction: () => Promise<void>;
  reopenAction: () => Promise<void>;
  voidDeliveryActions: Record<string, Bound>;
  voidPaymentActions: Record<string, Bound>;
}) {
  const status = derivePOStatus(po);
  const isDraft = po.status === "planned";
  const isOrdered = po.status === "ordered";
  const isClosed = po.status === "closed";
  const isCancelled = po.status === "cancelled";

  const ordered = orderedTotal(po);
  const delivered = acceptedValue(po);
  const paid = paidTotal(po);
  const outstanding = outstandingValue(po);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {po.projectName} &middot; {po.stageName}
          </p>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            {po.displayNumber ?? "Draft purchase order"}
          </h1>
          <p className="mt-1 text-muted-foreground">{po.supplierName}</p>
        </div>
        <POStatusBadge status={status} />
      </header>

      {isDraft && (
        <p className="mb-6 rounded-lg border border-border-strong bg-muted p-3 text-sm text-muted-foreground">
          This order is still a draft. Issuing it freezes the supplier, lines,
          quantities and unit prices, and assigns its number.
        </p>
      )}
      {isCancelled && po.cancelReason && (
        <p className="mb-6 rounded-lg bg-health-red-bg p-3 text-sm text-health-red">
          Cancelled: {po.cancelReason}
        </p>
      )}
      {isClosed && (
        <p className="mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          This order is closed. Its float exposure is limited to what has been
          paid. Reopen it if more needs to be recorded against it.
        </p>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Ordered" amount={ordered} emphasis />
        <Stat label="Delivered (accepted)" amount={delivered} />
        <Stat label="Paid" amount={paid} />
        <Stat
          label="Outstanding"
          amount={outstanding}
          tone={outstanding < 0 ? "destructive" : undefined}
        />
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-card-foreground">Material lines</h2>
          {isDraft && (
            <Link
              href={editHref}
              className="text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Edit draft
            </Link>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th className="pb-2 font-bold">Item</th>
                <th className="pb-2 font-bold">Ordered</th>
                {!isDraft && <th className="pb-2 font-bold">Delivered</th>}
                {!isDraft && <th className="pb-2 font-bold">Accepted</th>}
                {!isDraft && <th className="pb-2 font-bold">Rejected</th>}
                <th className="pb-2 text-right font-bold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 text-card-foreground">{l.item}</td>
                  <td className="py-3 text-muted-foreground">
                    {l.qtyOrdered} {l.unit}
                  </td>
                  {!isDraft && (
                    <td className="py-3 text-muted-foreground">
                      {l.qtyDelivered} {l.unit}
                    </td>
                  )}
                  {!isDraft && (
                    <td className="py-3 text-muted-foreground">
                      {l.qtyAccepted} {l.unit}
                    </td>
                  )}
                  {!isDraft && (
                    <td
                      className={`py-3 ${l.qtyRejected > 0 ? "font-bold text-destructive" : "text-muted-foreground"}`}
                    >
                      {l.qtyRejected} {l.unit}
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <Money
                      amount={l.qtyOrdered * l.unitPrice}
                      className="font-bold text-card-foreground"
                    />
                  </td>
                </tr>
              ))}
              {po.lines.length === 0 && (
                <tr>
                  <td colSpan={isDraft ? 3 : 6} className="py-3 text-muted-foreground">
                    No lines on this order yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {po.orderedAt ? `Issued ${formatDate(po.orderedAt)}` : "Not yet issued"}
          {po.expectedDeliveryOn && (
            <> &middot; expected delivery {formatDate(po.expectedDeliveryOn)}</>
          )}
          {po.paymentTerms && <> &middot; {po.paymentTerms}</>}
        </p>
        {po.supplierAckNote && (
          <p className="mt-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Supplier acknowledgement
            {po.supplierAckOn && ` (${formatDate(po.supplierAckOn)})`}:{" "}
            {po.supplierAckNote}
          </p>
        )}
        {po.notes && (
          <p className="mt-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {po.notes}
          </p>
        )}
      </Card>

      {!isDraft && po.displayNumber && (
        <div className="mb-6">
          <DocumentDownloads
            links={[
              {
                label: `Purchase order ${po.displayNumber}`,
                pdfHref: `/projects/${projectId}/procurement/${po.id}/document.pdf`,
                jpgHref: `/projects/${projectId}/procurement/${po.id}/document.jpg`,
              },
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DeliveriesCard
              po={po}
              canRecord={isOrdered}
              deliveryAction={deliveryAction}
              voidActions={voidDeliveryActions}
            />
            <PaymentsCard
              po={po}
              canRecord={isOrdered}
              paymentAction={paymentAction}
              voidActions={voidPaymentActions}
            />
          </div>

          {(isOrdered || isClosed) && <SupplierAckCard ackAction={ackAction} />}

          {isOrdered && (
            <TerminalCard cancelAction={cancelAction} closeAction={closeAction} />
          )}
          {isClosed && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-card-foreground">Reopen</h2>
              <p className="text-sm text-muted-foreground">
                Reopening puts the order back to issued so more deliveries or
                payments can be recorded.
              </p>
              <form action={reopenAction}>
                <Button variant="secondary" type="submit">
                  Reopen this order
                </Button>
              </form>
            </Card>
          )}

          <Link
            href={`/projects/${projectId}/procurement`}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
          >
            Back to all purchase orders
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
      <h2 className="text-xl font-bold text-card-foreground">Issue to supplier</h2>
      <p className="text-sm text-muted-foreground">
        This freezes the order and cannot be undone — a real change after this is
        made by cancelling and raising a new order.
      </p>
      {issueError && (
        <p className="text-sm font-bold text-destructive">{issueError}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <form action={issueAction}>
          <Button variant="primary" type="submit">
            <PaperPlaneTilt size={18} aria-hidden="true" />
            Issue purchase order
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

function DeliveriesCard({
  po,
  canRecord,
  deliveryAction,
  voidActions,
}: {
  po: PurchaseOrder;
  canRecord: boolean;
  deliveryAction: Bound;
  voidActions: Record<string, Bound>;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">Deliveries</h2>
      {po.deliveries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No deliveries recorded yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {po.deliveries.map((d) => (
            <li
              key={d.id}
              className={`rounded-lg border border-border p-3 text-sm ${d.voidedAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-card-foreground">
                  {d.noteNumber ?? "No delivery note"}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(d.deliveredOn)}
                </span>
              </div>
              {d.siteNotes && (
                <p className="mt-1 text-muted-foreground">{d.siteNotes}</p>
              )}
              {d.overDeliveryReason && (
                <p className="mt-1 text-health-amber">
                  Over-delivery: {d.overDeliveryReason}
                </p>
              )}
              {d.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  Voided{d.voidReason ? ` — ${d.voidReason}` : ""}
                </p>
              ) : (
                <VoidForm action={voidActions[d.id]} label="Void delivery" />
              )}
            </li>
          ))}
        </ul>
      )}

      {canRecord && po.lines.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <RecordDeliveryForm po={po} action={deliveryAction} />
        </div>
      )}
    </Card>
  );
}

function RecordDeliveryForm({
  po,
  action,
}: {
  po: PurchaseOrder;
  action: Bound;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const [rows, setRows] = useState<
    Record<string, { delivered: string; accepted: string; rejected: string }>
  >(
    Object.fromEntries(
      po.lines.map((l) => [l.id, { delivered: "", accepted: "", rejected: "" }]),
    ),
  );

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const serialized = po.lines
    .map((l) => ({
      lineId: l.id,
      qtyDelivered: num(rows[l.id]?.delivered ?? ""),
      qtyAccepted: num(rows[l.id]?.accepted ?? ""),
      qtyRejected: num(rows[l.id]?.rejected ?? ""),
    }))
    .filter(
      (r) => r.qtyDelivered > 0 || r.qtyAccepted > 0 || r.qtyRejected > 0,
    );

  const set = (
    lineId: string,
    patch: Partial<{ delivered: string; accepted: string; rejected: string }>,
  ) =>
    setRows((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], ...patch },
    }));

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(serialized)} />
      <h3 className="font-bold text-card-foreground">Record a delivery</h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-1 font-bold">Item</th>
              <th className="pb-1 font-bold">Delivered</th>
              <th className="pb-1 font-bold">Accepted</th>
              <th className="pb-1 font-bold">Rejected</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => {
              const remaining = Math.max(0, l.qtyOrdered - l.qtyDelivered);
              return (
                <tr key={l.id}>
                  <td className="py-1 pr-2 text-card-foreground">
                    {l.item}
                    <span className="block text-xs text-muted-foreground">
                      {remaining} {l.unit} left of {l.qtyOrdered}
                    </span>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      aria-label={`${l.item} delivered`}
                      value={rows[l.id]?.delivered ?? ""}
                      onChange={(e) => set(l.id, { delivered: e.target.value })}
                      className="min-h-10 w-24 rounded-lg border border-border-strong bg-card px-2 py-1"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      aria-label={`${l.item} accepted`}
                      value={rows[l.id]?.accepted ?? ""}
                      onChange={(e) => set(l.id, { accepted: e.target.value })}
                      className="min-h-10 w-24 rounded-lg border border-border-strong bg-card px-2 py-1"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      aria-label={`${l.item} rejected`}
                      value={rows[l.id]?.rejected ?? ""}
                      onChange={(e) => set(l.id, { rejected: e.target.value })}
                      className="min-h-10 w-24 rounded-lg border border-border-strong bg-card px-2 py-1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors.lines && (
        <p className="text-sm font-bold text-destructive">{errors.lines}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Delivered on" required error={errors.deliveredOn}>
          <input
            name="deliveredOn"
            type="date"
            defaultValue={today()}
            className={controlClass}
          />
        </Field>
        <Field label="Delivery note number" error={errors.noteNumber}>
          <input name="noteNumber" className={controlClass} />
        </Field>
      </div>
      <Field label="Site notes" error={errors.siteNotes}>
        <input name="siteNotes" className={controlClass} />
      </Field>
      <Field
        label="Over-delivery reason"
        hint="Only needed if a line goes past its ordered quantity."
        error={errors.overDeliveryReason}
      >
        <input name="overDeliveryReason" className={controlClass} />
      </Field>

      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending ? "Recording…" : "Record delivery"}
        </Button>
      </div>
    </form>
  );
}

function PaymentsCard({
  po,
  canRecord,
  paymentAction,
  voidActions,
}: {
  po: PurchaseOrder;
  canRecord: boolean;
  paymentAction: Bound;
  voidActions: Record<string, Bound>;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">Payments</h2>
      {po.payments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No payments recorded yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {po.payments.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border border-border p-3 text-sm ${p.voidedAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-bold text-card-foreground">
                    {p.kind ?? "Payment"}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {p.method}
                    {p.reference && ` · ${p.reference}`} &middot;{" "}
                    {formatDate(p.paidOn)}
                  </span>
                </span>
                <Money
                  amount={p.amount}
                  className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${p.voidedAt ? "line-through" : ""}`}
                />
              </div>
              {p.overPaymentReason && (
                <p className="mt-1 text-health-amber">
                  Over-payment: {p.overPaymentReason}
                </p>
              )}
              {p.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  Voided{p.voidReason ? ` — ${p.voidReason}` : ""}
                </p>
              ) : (
                <VoidForm action={voidActions[p.id]} label="Void payment" />
              )}
            </li>
          ))}
        </ul>
      )}

      {canRecord && (
        <div className="mt-5 border-t border-border pt-4">
          <RecordPaymentForm action={paymentAction} />
        </div>
      )}
    </Card>
  );
}

function RecordPaymentForm({ action }: { action: Bound }) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h3 className="font-bold text-card-foreground">Record a payment</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (TZS)" required error={errors.amount}>
          <input name="amount" type="number" min={1} className={controlClass} />
        </Field>
        <Field label="Paid on" required error={errors.paidOn}>
          <input
            name="paidOn"
            type="date"
            defaultValue={today()}
            className={controlClass}
          />
        </Field>
        <Field label="Method" required error={errors.method}>
          <select
            name="method"
            defaultValue="bank_transfer"
            className={`${controlClass} cursor-pointer`}
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Kind" error={errors.kind}>
          <select
            name="kind"
            defaultValue=""
            className={`${controlClass} cursor-pointer`}
          >
            <option value="">Unspecified</option>
            <option value="deposit">Deposit</option>
            <option value="partial">Partial</option>
            <option value="final">Final</option>
          </select>
        </Field>
      </div>
      <Field label="Reference" error={errors.reference}>
        <input name="reference" className={controlClass} />
      </Field>
      <Field
        label="Over-payment reason"
        hint="Only needed if this takes the paid total past the ordered total."
        error={errors.overPaymentReason}
      >
        <input name="overPaymentReason" className={controlClass} />
      </Field>
      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}

function SupplierAckCard({ ackAction }: { ackAction: Bound }) {
  const [state, formAction, pending] = useActionState(ackAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">
        Supplier acknowledgement
      </h2>
      <p className="text-sm text-muted-foreground">
        A dated note that the supplier confirmed the order — it does not change
        the order&apos;s state.
      </p>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="What did the supplier confirm?" required error={errors.supplierAckNote}>
            <input name="supplierAckNote" className={controlClass} />
          </Field>
          <Field label="On" error={errors.supplierAckOn}>
            <input
              name="supplierAckOn"
              type="date"
              defaultValue={today()}
              className={controlClass}
            />
          </Field>
        </div>
        {state.error && (
          <p className="text-sm font-bold text-destructive">{state.error}</p>
        )}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save acknowledgement"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TerminalCard({
  cancelAction,
  closeAction,
}: {
  cancelAction: Bound;
  closeAction: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(cancelAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-card-foreground">Close or cancel</h2>
      <p className="text-sm text-muted-foreground">
        Close an order once everything against it is recorded — its float
        exposure then drops to what has been paid. Cancel it if it is being
        replaced; a real change is cancel-and-reissue.
      </p>
      <form action={closeAction}>
        <Button variant="secondary" type="submit">
          Close this order
        </Button>
      </form>
      <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4" noValidate>
        <Field label="Reason for cancelling" required error={errors.reason}>
          <input name="reason" className={controlClass} />
        </Field>
        {state.error && (
          <p className="text-sm font-bold text-destructive">{state.error}</p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-md transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
          >
            {pending ? "Cancelling…" : "Cancel this order"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function VoidForm({ action, label }: { action: Bound; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        name="reason"
        placeholder="Reason to void"
        aria-label={`Reason to ${label.toLowerCase()}`}
        className="min-h-10 flex-1 rounded-lg border border-border-strong bg-card px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-md transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
      >
        <Trash size={14} aria-hidden="true" />
        {label}
      </button>
      {(state.fieldErrors?.reason || state.error) && (
        <span className="w-full text-sm font-bold text-destructive">
          {state.fieldErrors?.reason ?? state.error}
        </span>
      )}
    </form>
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
