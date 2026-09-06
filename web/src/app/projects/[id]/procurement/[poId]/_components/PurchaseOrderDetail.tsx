"use client";

import { useState } from "react";
import { Truck, HandCoins, CheckCircle, Archive } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";
import {
  type PurchaseOrder,
  type PaymentMethod,
  type PaymentType,
  derivePOStatus,
  orderedTotal,
  acceptedValue,
  paidTotal,
  outstandingValue,
} from "@/lib/procurement-mock";
import { POStatusBadge } from "../../_components/POStatusBadge";

const PAYMENT_METHODS: PaymentMethod[] = ["Bank Transfer", "Mobile Money", "Cash", "Cheque"];
const PAYMENT_TYPES: PaymentType[] = ["Deposit", "Partial", "Final"];

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseOrderDetail({
  initialPO,
  projectName,
}: {
  initialPO: PurchaseOrder;
  projectName: string;
}) {
  const [po, setPo] = useState(initialPO);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const status = derivePOStatus(po);
  const ordered = orderedTotal(po);
  const delivered = acceptedValue(po);
  const paid = paidTotal(po);
  const outstanding = outstandingValue(po);

  const canConfirm = status === "Issued";
  const canCancel =
    po.deliveries.length === 0 && po.payments.length === 0 && !po.cancelled && !po.closed;
  const canClose =
    status === "Paid" &&
    po.lines.every((l) => l.qtyAccepted >= l.qtyOrdered) &&
    !po.closed;

  function confirmOrder() {
    setPo((p) => ({ ...p, confirmed: true }));
  }
  function cancelOrder() {
    setPo((p) => ({ ...p, cancelled: true }));
  }
  function closeOrder() {
    setPo((p) => ({ ...p, closed: true }));
  }

  function recordDelivery(
    entries: Record<string, { delivered: number; rejected: number }>,
    noteNumber: string,
    siteNotes: string
  ) {
    setPo((p) => {
      const deliveryLines = p.lines
        .map((l) => {
          const entry = entries[l.id];
          if (!entry || entry.delivered <= 0) return null;
          const accepted = Math.max(0, entry.delivered - entry.rejected);
          return {
            lineId: l.id,
            qtyDelivered: entry.delivered,
            qtyAccepted: accepted,
            qtyRejected: entry.rejected,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const updatedLines = p.lines.map((l) => {
        const entry = entries[l.id];
        if (!entry || entry.delivered <= 0) return l;
        const accepted = Math.max(0, entry.delivered - entry.rejected);
        return {
          ...l,
          qtyDelivered: l.qtyDelivered + entry.delivered,
          qtyAccepted: l.qtyAccepted + accepted,
          qtyRejected: l.qtyRejected + entry.rejected,
        };
      });

      return {
        ...p,
        lines: updatedLines,
        deliveries: [
          ...p.deliveries,
          {
            id: crypto.randomUUID(),
            date: isoToday(),
            noteNumber,
            siteNotes: siteNotes || undefined,
            lines: deliveryLines,
          },
        ],
      };
    });
    setShowDeliveryForm(false);
  }

  function recordPayment(
    amount: number,
    method: PaymentMethod,
    reference: string,
    type: PaymentType
  ) {
    setPo((p) => ({
      ...p,
      payments: [
        ...p.payments,
        { id: crypto.randomUUID(), date: isoToday(), amount, method, reference, type },
      ],
    }));
    setShowPaymentForm(false);
  }

  // One dominant action, chosen by where the order is in its lifecycle.
  const openDelivery = () => {
    setShowPaymentForm(false);
    setShowDeliveryForm(true);
  };
  const openPayment = () => {
    setShowDeliveryForm(false);
    setShowPaymentForm(true);
  };

  let primaryAction: { label: string; onClick: () => void } | null = null;
  if (!po.cancelled && !po.closed) {
    if (status === "Issued") primaryAction = { label: "Confirm order", onClick: confirmOrder };
    else if (status === "Confirmed" || status === "Partially Delivered")
      primaryAction = { label: "Record delivery", onClick: openDelivery };
    else if (status === "Delivered" || status === "Partially Paid")
      primaryAction = { label: "Record payment", onClick: openPayment };
    else if (canClose) primaryAction = { label: "Close order", onClick: closeOrder };
  }

  const showDeliverySecondary =
    !po.cancelled && !po.closed && primaryAction?.label !== "Record delivery";
  const showPaymentSecondary =
    !po.cancelled && !po.closed && primaryAction?.label !== "Record payment";

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {projectName} &middot; {po.stageName}
          </p>
          <h1 className="text-[1.75rem] font-bold text-foreground">{po.number}</h1>
          <p className="mt-1 text-muted-foreground">{po.supplier}</p>
        </div>
        <POStatusBadge status={status} />
      </header>

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Ordered" amount={ordered} emphasis />
        <Stat label="Delivered" amount={delivered} />
        <Stat label="Paid" amount={paid} />
        <Stat
          label="Outstanding"
          amount={outstanding}
          tone={outstanding > 0 ? "destructive" : undefined}
        />
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-bold text-card-foreground">Material lines</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th className="pb-2 font-bold">Item</th>
                <th className="pb-2 font-bold">Ordered</th>
                <th className="pb-2 font-bold">Delivered</th>
                <th className="pb-2 font-bold">Accepted</th>
                <th className="pb-2 font-bold">Rejected</th>
                <th className="pb-2 text-right font-bold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 text-card-foreground">{l.item}</td>
                  <td className="py-3 text-muted-foreground">{l.qtyOrdered} {l.unit}</td>
                  <td className="py-3 text-muted-foreground">{l.qtyDelivered} {l.unit}</td>
                  <td className="py-3 text-muted-foreground">{l.qtyAccepted} {l.unit}</td>
                  <td
                    className={`py-3 ${l.qtyRejected > 0 ? "font-bold text-destructive" : "text-muted-foreground"}`}
                  >
                    {l.qtyRejected} {l.unit}
                  </td>
                  <td className="py-3 text-right">
                    <Money
                      amount={l.qtyOrdered * l.unitPrice}
                      className="font-bold text-card-foreground"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Issued {formatDate(po.date)} &middot; expected delivery{" "}
          {formatDate(po.expectedDeliveryDate)} &middot; {po.paymentTerms}
        </p>
        {po.notes && (
          <p className="mt-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {po.notes}
          </p>
        )}
      </Card>

      {!po.cancelled && !po.closed && (
        <section className="mb-6 flex flex-wrap items-center gap-3">
          {primaryAction && (
            <Button variant="primary" type="button" onClick={primaryAction.onClick}>
              {primaryAction.label === "Record delivery" && (
                <Truck size={20} aria-hidden="true" />
              )}
              {primaryAction.label === "Record payment" && (
                <HandCoins size={20} aria-hidden="true" />
              )}
              {primaryAction.label === "Confirm order" && (
                <CheckCircle size={20} aria-hidden="true" />
              )}
              {primaryAction.label === "Close order" && (
                <Archive size={20} aria-hidden="true" />
              )}
              {primaryAction.label}
            </Button>
          )}
          {canConfirm && primaryAction?.label !== "Confirm order" && (
            <Button variant="secondary" type="button" onClick={confirmOrder}>
              <CheckCircle size={20} aria-hidden="true" />
              Confirm order
            </Button>
          )}
          {showDeliverySecondary && (
            <Button variant="secondary" type="button" onClick={openDelivery}>
              <Truck size={20} aria-hidden="true" />
              Record delivery
            </Button>
          )}
          {showPaymentSecondary && (
            <Button variant="secondary" type="button" onClick={openPayment}>
              <HandCoins size={20} aria-hidden="true" />
              Record payment
            </Button>
          )}
          {canClose && primaryAction?.label !== "Close order" && (
            <Button variant="secondary" type="button" onClick={closeOrder}>
              <Archive size={20} aria-hidden="true" />
              Close order
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger-quiet"
              type="button"
              onClick={cancelOrder}
              className="ml-auto"
            >
              Cancel order
            </Button>
          )}
        </section>
      )}

      {showDeliveryForm && (
        <DeliveryForm
          po={po}
          onCancel={() => setShowDeliveryForm(false)}
          onSubmit={recordDelivery}
        />
      )}
      {showPaymentForm && (
        <PaymentForm
          outstanding={outstanding}
          onCancel={() => setShowPaymentForm(false)}
          onSubmit={recordPayment}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HistoryPanel title="Deliveries">
          {po.deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {po.deliveries.map((d) => (
                <li key={d.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-card-foreground">{d.noteNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(d.date)}
                    </span>
                  </div>
                  {d.siteNotes && (
                    <p className="mt-1 text-sm text-muted-foreground">{d.siteNotes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </HistoryPanel>
        <HistoryPanel title="Payments">
          {po.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {po.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span>
                    <span className="font-bold text-card-foreground">{p.type}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {p.method} &middot; {p.reference} &middot; {formatDate(p.date)}
                    </span>
                  </span>
                  <Money
                    amount={p.amount}
                    className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
                  />
                </li>
              ))}
            </ul>
          )}
        </HistoryPanel>
      </div>
    </div>
  );
}

function DeliveryForm({
  po,
  onCancel,
  onSubmit,
}: {
  po: PurchaseOrder;
  onCancel: () => void;
  onSubmit: (
    entries: Record<string, { delivered: number; rejected: number }>,
    noteNumber: string,
    siteNotes: string
  ) => void;
}) {
  const [noteNumber, setNoteNumber] = useState("");
  const [siteNotes, setSiteNotes] = useState("");
  const [qty, setQty] = useState<Record<string, { delivered: string; rejected: string }>>(
    () => Object.fromEntries(po.lines.map((l) => [l.id, { delivered: "0", rejected: "0" }]))
  );
  const [attempted, setAttempted] = useState(false);

  const hasQuantity = po.lines.some((l) => Number(qty[l.id]?.delivered) > 0);
  const noteMissing = noteNumber.trim().length === 0;
  const canSubmit = !noteMissing && hasQuantity;

  return (
    <section className="mb-6 rounded-lg border border-border-strong bg-muted p-4">
      <h3 className="text-base font-bold text-foreground">Record delivery</h3>
      <div className="mt-4 flex flex-col gap-4">
        {po.lines.map((l) => {
          const remaining = Math.max(0, l.qtyOrdered - l.qtyDelivered);
          return (
            <div key={l.id} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-bold text-card-foreground">
                {l.item}
                <span className="ml-2 font-normal text-muted-foreground">
                  {remaining} {l.unit} remaining
                </span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={`Quantity delivered (${l.unit})`}>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    value={qty[l.id]?.delivered ?? "0"}
                    onChange={(e) =>
                      setQty((q) => ({
                        ...q,
                        [l.id]: { ...q[l.id], delivered: e.target.value },
                      }))
                    }
                    className={controlClass}
                  />
                </Field>
                <Field label={`Quantity rejected (${l.unit})`}>
                  <input
                    type="number"
                    min={0}
                    value={qty[l.id]?.rejected ?? "0"}
                    onChange={(e) =>
                      setQty((q) => ({
                        ...q,
                        [l.id]: { ...q[l.id], rejected: e.target.value },
                      }))
                    }
                    className={controlClass}
                  />
                </Field>
              </div>
            </div>
          );
        })}
        <Field
          label="Delivery note number"
          required
          error={attempted && noteMissing ? "Enter the delivery note number." : undefined}
        >
          <input
            value={noteNumber}
            onChange={(e) => setNoteNumber(e.target.value)}
            className={controlClass}
          />
        </Field>
        <Field label="Site notes" hint="Optional — anything the record should show.">
          <textarea
            value={siteNotes}
            onChange={(e) => setSiteNotes(e.target.value)}
            rows={2}
            className={`${controlClass} min-h-24`}
          />
        </Field>
      </div>
      {attempted && !hasQuantity && (
        <p className="mt-3 text-sm font-bold text-destructive">
          Enter a delivered quantity for at least one line.
        </p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="primary"
          type="button"
          onClick={() => {
            setAttempted(true);
            if (!canSubmit) return;
            onSubmit(
              Object.fromEntries(
                Object.entries(qty).map(([id, v]) => [
                  id,
                  { delivered: Number(v.delivered) || 0, rejected: Number(v.rejected) || 0 },
                ])
              ),
              noteNumber,
              siteNotes
            );
          }}
        >
          Save delivery
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </section>
  );
}

function PaymentForm({
  outstanding,
  onCancel,
  onSubmit,
}: {
  outstanding: number;
  onCancel: () => void;
  onSubmit: (amount: number, method: PaymentMethod, reference: string, type: PaymentType) => void;
}) {
  const [amount, setAmount] = useState(String(Math.max(0, outstanding)));
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [reference, setReference] = useState("");
  const [type, setType] = useState<PaymentType>("Partial");
  const [attempted, setAttempted] = useState(false);

  const amountInvalid = !(Number(amount) > 0);
  const referenceMissing = reference.trim().length === 0;
  const canSubmit = !amountInvalid && !referenceMissing;

  return (
    <section className="mb-6 rounded-lg border border-border-strong bg-muted p-4">
      <h3 className="text-base font-bold text-foreground">Record payment</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Amount (TZS)"
          required
          hint={`Outstanding: ${Math.max(0, outstanding).toLocaleString("en-US")}`}
          error={attempted && amountInvalid ? "Enter an amount greater than zero." : undefined}
        >
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={controlClass}
          />
        </Field>
        <Field label="Payment type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PaymentType)}
            className={`${controlClass} cursor-pointer`}
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={`${controlClass} cursor-pointer`}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Payment reference"
          required
          error={
            attempted && referenceMissing ? "Enter the payment reference." : undefined
          }
        >
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={controlClass}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="primary"
          type="button"
          onClick={() => {
            setAttempted(true);
            if (!canSubmit) return;
            onSubmit(Number(amount), method, reference, type);
          }}
        >
          Save payment
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </section>
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

function HistoryPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
