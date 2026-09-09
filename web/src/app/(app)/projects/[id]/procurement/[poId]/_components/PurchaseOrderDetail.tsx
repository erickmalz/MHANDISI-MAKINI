import { Money } from "@/components/ui/Money";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import {
  type PurchaseOrder,
  derivePOStatus,
  orderedTotal,
  acceptedValue,
  paidTotal,
  outstandingValue,
} from "@/lib/procurement";
import { POStatusBadge } from "../../_components/POStatusBadge";

/**
 * Read-only view of one Purchase Order against the DAL (Slice 2.3). The Issue /
 * record-delivery / record-payment / cancel / close actions are rebuilt on the
 * write DAL in Slice 2.6 (multi-tenancy ticket 09 §2/§3).
 */
export function PurchaseOrderDetail({ po }: { po: PurchaseOrder }) {
  const status = derivePOStatus(po);
  const ordered = orderedTotal(po);
  const delivered = acceptedValue(po);
  const paid = paidTotal(po);
  const outstanding = outstandingValue(po);

  const issuedLabel = po.orderedAt ? formatDate(po.orderedAt) : null;

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

      {po.status === "planned" && (
        <p className="mb-6 rounded-lg border border-border-strong bg-muted p-3 text-sm text-muted-foreground">
          This order is still a draft. Issuing it freezes the supplier, lines,
          quantities and unit prices, and assigns its number.
        </p>
      )}

      {po.status === "cancelled" && po.cancelReason && (
        <p className="mb-6 rounded-lg bg-health-red-bg p-3 text-sm text-health-red">
          Cancelled: {po.cancelReason}
        </p>
      )}

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
              {po.lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-muted-foreground">
                    No lines on this order yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {issuedLabel ? `Issued ${issuedLabel}` : "Not yet issued"}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HistoryPanel title="Deliveries">
          {po.deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {po.deliveries.map((d) => (
                <li
                  key={d.id}
                  className={`rounded-lg border border-border p-3 text-sm ${d.voidedAt ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-card-foreground">
                      {d.noteNumber ?? "No delivery note"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(d.deliveredOn)}
                    </span>
                  </div>
                  {d.siteNotes && (
                    <p className="mt-1 text-sm text-muted-foreground">{d.siteNotes}</p>
                  )}
                  {d.overDeliveryReason && (
                    <p className="mt-1 text-sm text-health-amber">
                      Over-delivery: {d.overDeliveryReason}
                    </p>
                  )}
                  {d.voidedAt && (
                    <p className="mt-1 text-sm font-bold text-destructive">
                      Voided{d.voidReason ? ` — ${d.voidReason}` : ""}
                    </p>
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
                  className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm ${p.voidedAt ? "opacity-60" : ""}`}
                >
                  <span>
                    <span className="font-bold text-card-foreground">
                      {p.kind ?? "Payment"}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {p.method}
                      {p.reference && ` · ${p.reference}`} &middot;{" "}
                      {formatDate(p.paidOn)}
                    </span>
                    {p.voidedAt && (
                      <span className="ml-2 text-sm font-bold text-destructive">
                        Voided{p.voidReason ? ` — ${p.voidReason}` : ""}
                      </span>
                    )}
                  </span>
                  <Money
                    amount={p.amount}
                    className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${p.voidedAt ? "line-through" : ""}`}
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
