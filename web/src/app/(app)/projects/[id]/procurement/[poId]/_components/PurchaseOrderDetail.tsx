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
import { DataTable } from "@/components/ui/DataTable";
import { Money } from "@/components/ui/Money";
import { formatDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { ActionState } from "@/lib/forms/action-helpers";
import {
  type PurchaseOrder,
  acceptedValue,
  derivePOStatus,
  orderedTotal,
  outstandingValue,
  paidTotal,
  type PaymentMethod,
  type SupplierPaymentKind,
} from "@/lib/procurement";
import { POStatusBadge } from "../../_components/POStatusBadge";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { MoneyInput } from "@/components/ui/MoneyInput";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const today = () => new Date().toISOString().slice(0, 10);

const METHOD_LABEL: Record<PaymentMethod, MessageKey> = {
  "Bank Transfer": "procurement.method.bankTransfer",
  "Mobile Money": "procurement.method.mobileMoney",
  Cheque: "procurement.method.cheque",
  Cash: "procurement.method.cash",
  Other: "procurement.method.other",
};

const KIND_LABEL: Record<SupplierPaymentKind, MessageKey> = {
  Deposit: "procurement.kind.deposit",
  Partial: "procurement.kind.partial",
  Final: "procurement.kind.final",
};

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
  const t = useT();
  const locale = useLocale();
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
            {po.displayNumber ?? t("procurement.detail.draftTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{po.supplierName}</p>
        </div>
        <POStatusBadge status={status} />
      </header>

      {isDraft && (
        <p className="mb-6 rounded-lg border border-border-strong bg-muted p-3 text-sm text-muted-foreground">
          {t("procurement.detail.draftNotice")}
        </p>
      )}
      {isCancelled && po.cancelReason && (
        <p className="mb-6 rounded-lg bg-health-red-bg p-3 text-sm font-bold text-foreground">
          {t("procurement.detail.cancelled", { reason: po.cancelReason })}
        </p>
      )}
      {isClosed && (
        <p className="mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {t("procurement.detail.closedNotice")}
        </p>
      )}

      <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t("procurement.detail.ordered")} amount={ordered} emphasis />
        <Stat label={t("procurement.detail.deliveredAccepted")} amount={delivered} />
        <Stat label={t("procurement.detail.paid")} amount={paid} />
        <Stat
          label={t("procurement.detail.outstanding")}
          amount={outstanding}
          tone={outstanding < 0 ? "destructive" : undefined}
        />
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-card-foreground">{t("procurement.detail.materialLines")}</h2>
          {isDraft && (
            <Button variant="ghost" href={editHref}>
              {t("procurement.detail.editDraft")}
            </Button>
          )}
        </div>
        {po.lines.length === 0 ? (
          <p className="mt-4 text-muted-foreground">{t("procurement.detail.noLines")}</p>
        ) : (
          <div className="mt-4">
            <DataTable
              caption={t("procurement.detail.linesCaption")}
              rows={po.lines}
              rowKey={(l) => l.id}
              columns={[
                {
                  key: "item",
                  header: t("procurement.detail.columns.item"),
                  className: "text-card-foreground",
                  cell: (l) => l.item,
                },
                {
                  key: "ordered",
                  header: t("procurement.detail.columns.ordered"),
                  className: "text-muted-foreground",
                  cell: (l) => `${l.qtyOrdered} ${l.unit}`,
                },
                ...(isDraft
                  ? []
                  : [
                      {
                        key: "delivered",
                        header: t("procurement.detail.columns.delivered"),
                        className: "text-muted-foreground",
                        cell: (l: (typeof po.lines)[number]) => `${l.qtyDelivered} ${l.unit}`,
                      },
                      {
                        key: "accepted",
                        header: t("procurement.detail.columns.accepted"),
                        className: "text-muted-foreground",
                        cell: (l: (typeof po.lines)[number]) => `${l.qtyAccepted} ${l.unit}`,
                      },
                      {
                        key: "rejected",
                        header: t("procurement.detail.columns.rejected"),
                        cell: (l: (typeof po.lines)[number]) => (
                          <span
                            className={
                              l.qtyRejected > 0
                                ? "font-bold text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {l.qtyRejected} {l.unit}
                          </span>
                        ),
                      },
                    ]),
                {
                  key: "value",
                  header: t("procurement.detail.columns.value"),
                  align: "right" as const,
                  cell: (l) => (
                    <Money
                      amount={l.qtyOrdered * l.unitPrice}
                      className="font-bold text-card-foreground"
                    />
                  ),
                },
              ]}
            />
          </div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {[
            po.orderedAt
              ? t("procurement.detail.issuedOn", { date: formatDate(po.orderedAt, locale) })
              : t("procurement.detail.notYetIssued"),
            po.expectedDeliveryOn &&
              t("procurement.detail.expectedDelivery", {
                date: formatDate(po.expectedDeliveryOn, locale),
              }),
            po.paymentTerms,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {po.supplierAckNote && (
          <p className="mt-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {po.supplierAckOn
              ? t("procurement.detail.ackInline", {
                  date: formatDate(po.supplierAckOn, locale),
                  note: po.supplierAckNote,
                })
              : t("procurement.detail.ackInlineNoDate", { note: po.supplierAckNote })}
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
                label: t("procurement.detail.documentOrder", { number: po.displayNumber }),
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
              <h2 className="text-xl font-bold text-card-foreground">
                {t("procurement.detail.reopen.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("procurement.detail.reopen.body")}
              </p>
              <form action={reopenAction}>
                <Button variant="secondary" type="submit">
                  {t("procurement.detail.reopen.action")}
                </Button>
              </form>
            </Card>
          )}

          <Link
            href={`/projects/${projectId}/procurement`}
            className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
          >
            {t("procurement.detail.backToAll")}
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
  const t = useT();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">{t("procurement.detail.issue.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("procurement.detail.issue.warning")}
      </p>
      {issueError && (
        <Notice tone="error">{issueError}</Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <form action={issueAction}>
          <Button variant="primary" type="submit">
            <PaperPlaneTilt size={18} aria-hidden="true" />
            {t("procurement.detail.issue.action")}
          </Button>
        </form>
        <form action={discardAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
          >
            {t("procurement.detail.issue.discard")}
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
  const t = useT();
  const locale = useLocale();
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{t("procurement.detail.deliveries.title")}</h2>
      {po.deliveries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("procurement.detail.deliveries.none")}
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
                  {d.noteNumber ?? t("procurement.detail.deliveries.noNote")}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(d.deliveredOn, locale)}
                </span>
              </div>
              {d.siteNotes && (
                <p className="mt-1 text-muted-foreground">{d.siteNotes}</p>
              )}
              {d.overDeliveryReason && (
                <p className="mt-1 text-health-amber">
                  {t("procurement.detail.deliveries.overDelivery", {
                    reason: d.overDeliveryReason,
                  })}
                </p>
              )}
              {d.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  {d.voidReason
                    ? t("procurement.detail.deliveries.voidedWithReason", { reason: d.voidReason })
                    : t("procurement.detail.deliveries.voided")}
                </p>
              ) : (
                <VoidForm
                  action={voidActions[d.id]}
                  label={t("procurement.detail.deliveries.voidAction")}
                  ariaLabel={t("procurement.detail.deliveries.voidReasonAria")}
                />
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
  const t = useT();
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
      <h3 className="font-bold text-card-foreground">{t("procurement.detail.recordDelivery.title")}</h3>

      <DataTable
        caption={t("procurement.detail.recordDelivery.caption")}
        responsive="scroll"
        rows={po.lines}
        rowKey={(l) => l.id}
        columns={[
          {
            key: "item",
            header: t("procurement.detail.columns.item"),
            className: "text-card-foreground",
            cell: (l) => (
              <>
                {l.item}
                <span className="block text-sm text-muted-foreground">
                  {t("procurement.detail.recordDelivery.remaining", {
                    remaining: Math.max(0, l.qtyOrdered - l.qtyDelivered),
                    unit: l.unit,
                    ordered: l.qtyOrdered,
                  })}
                </span>
              </>
            ),
          },
          {
            key: "delivered",
            header: t("procurement.detail.columns.delivered"),
            cell: (l) => (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.001"
                    aria-label={t("procurement.detail.recordDelivery.deliveredAria", { item: l.item })}
                    value={rows[l.id]?.delivered ?? ""}
                    onChange={(e) => set(l.id, { delivered: e.target.value })}
                    className="min-h-12 w-20 rounded-lg border border-control-border bg-card px-2 py-1"
                  />
            ),
          },
          {
            key: "accepted",
            header: t("procurement.detail.columns.accepted"),
            cell: (l) => (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.001"
                    aria-label={t("procurement.detail.recordDelivery.acceptedAria", { item: l.item })}
                    value={rows[l.id]?.accepted ?? ""}
                    onChange={(e) => set(l.id, { accepted: e.target.value })}
                    className="min-h-12 w-20 rounded-lg border border-control-border bg-card px-2 py-1"
                  />
            ),
          },
          {
            key: "rejected",
            header: t("procurement.detail.columns.rejected"),
            cell: (l) => (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.001"
                    aria-label={t("procurement.detail.recordDelivery.rejectedAria", { item: l.item })}
                    value={rows[l.id]?.rejected ?? ""}
                    onChange={(e) => set(l.id, { rejected: e.target.value })}
                    className="min-h-12 w-20 rounded-lg border border-control-border bg-card px-2 py-1"
                  />
            ),
          },
        ]}
      />
      {errors.lines && (
        <Notice tone="error">{errors.lines}</Notice>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("procurement.detail.recordDelivery.deliveredOn")} required error={errors.deliveredOn}>
          <input
            name="deliveredOn"
            type="date"
            defaultValue={today()}
            className={controlClass}
          />
        </Field>
        <Field label={t("procurement.detail.recordDelivery.noteNumber")} error={errors.noteNumber}>
          <input name="noteNumber" className={controlClass} />
        </Field>
      </div>
      <Field label={t("procurement.detail.recordDelivery.siteNotes")} error={errors.siteNotes}>
        <input name="siteNotes" className={controlClass} />
      </Field>
      <Field
        label={t("procurement.detail.recordDelivery.overReason")}
        hint={t("procurement.detail.recordDelivery.overHint")}
        error={errors.overDeliveryReason}
      >
        <input name="overDeliveryReason" className={controlClass} />
      </Field>

      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending
            ? t("procurement.detail.recordDelivery.submitting")
            : t("procurement.detail.recordDelivery.submit")}
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
  const t = useT();
  const locale = useLocale();
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{t("procurement.detail.payments.title")}</h2>
      {po.payments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("procurement.detail.payments.none")}
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
                    {p.kind ? t(KIND_LABEL[p.kind]) : t("procurement.kind.payment")}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {METHOD_LABEL[p.method] ? t(METHOD_LABEL[p.method]) : p.method}
                    {p.reference && ` · ${p.reference}`} &middot;{" "}
                    {formatDate(p.paidOn, locale)}
                  </span>
                </span>
                <Money
                  amount={p.amount}
                  className={`shrink-0 whitespace-nowrap font-bold text-card-foreground ${p.voidedAt ? "line-through" : ""}`}
                />
              </div>
              {p.overPaymentReason && (
                <p className="mt-1 text-health-amber">
                  {t("procurement.detail.payments.overPayment", {
                    reason: p.overPaymentReason,
                  })}
                </p>
              )}
              {p.voidedAt ? (
                <p className="mt-1 font-bold text-destructive">
                  {p.voidReason
                    ? t("procurement.detail.payments.voidedWithReason", { reason: p.voidReason })
                    : t("procurement.detail.payments.voided")}
                </p>
              ) : (
                <VoidForm
                  action={voidActions[p.id]}
                  label={t("procurement.detail.payments.voidAction")}
                  ariaLabel={t("procurement.detail.payments.voidReasonAria")}
                />
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
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <h3 className="font-bold text-card-foreground">{t("procurement.detail.recordPayment.title")}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("procurement.detail.recordPayment.amount")} required error={errors.amount}>
          <MoneyInput name="amount" />
        </Field>
        <Field label={t("procurement.detail.recordPayment.paidOn")} required error={errors.paidOn}>
          <input
            name="paidOn"
            type="date"
            defaultValue={today()}
            className={controlClass}
          />
        </Field>
        <Field label={t("procurement.detail.recordPayment.method")} required error={errors.method}>
          <select
            name="method"
            defaultValue="bank_transfer"
            className={`${controlClass} cursor-pointer`}
          >
            <option value="bank_transfer">{t("procurement.method.bankTransfer")}</option>
            <option value="mobile_money">{t("procurement.method.mobileMoney")}</option>
            <option value="cheque">{t("procurement.method.cheque")}</option>
            <option value="cash">{t("procurement.method.cash")}</option>
            <option value="other">{t("procurement.method.other")}</option>
          </select>
        </Field>
        <Field label={t("procurement.detail.recordPayment.kind")} error={errors.kind}>
          <select
            name="kind"
            defaultValue=""
            className={`${controlClass} cursor-pointer`}
          >
            <option value="">{t("procurement.kind.unspecified")}</option>
            <option value="deposit">{t("procurement.kind.deposit")}</option>
            <option value="partial">{t("procurement.kind.partial")}</option>
            <option value="final">{t("procurement.kind.final")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("procurement.detail.recordPayment.reference")} error={errors.reference}>
        <input name="reference" className={controlClass} />
      </Field>
      <Field
        label={t("procurement.detail.recordPayment.overReason")}
        hint={t("procurement.detail.recordPayment.overHint")}
        error={errors.overPaymentReason}
      >
        <input name="overPaymentReason" className={controlClass} />
      </Field>
      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          <CheckCircle size={18} aria-hidden="true" />
          {pending
            ? t("procurement.detail.recordPayment.submitting")
            : t("procurement.detail.recordPayment.submit")}
        </Button>
      </div>
    </form>
  );
}

function SupplierAckCard({ ackAction }: { ackAction: Bound }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(ackAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-card-foreground">
        {t("procurement.detail.ack.title")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("procurement.detail.ack.body")}
      </p>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <Field label={t("procurement.detail.ack.what")} required error={errors.supplierAckNote}>
            <input name="supplierAckNote" className={controlClass} />
          </Field>
          <Field label={t("procurement.detail.ack.on")} error={errors.supplierAckOn}>
            <input
              name="supplierAckOn"
              type="date"
              defaultValue={today()}
              className={controlClass}
            />
          </Field>
        </div>
        {state.error && (
          <Notice tone="error">{state.error}</Notice>
        )}
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? t("procurement.detail.ack.saving") : t("procurement.detail.ack.save")}
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
  const t = useT();
  const [state, formAction, pending] = useActionState(cancelAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-card-foreground">{t("procurement.detail.terminal.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("procurement.detail.terminal.body")}
      </p>
      <form action={closeAction}>
        <Button variant="secondary" type="submit">
          {t("procurement.detail.terminal.close")}
        </Button>
      </form>
      <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4" noValidate>
        <Field label={t("procurement.detail.terminal.cancelReason")} required error={errors.reason}>
          <input name="reason" className={controlClass} />
        </Field>
        {state.error && (
          <Notice tone="error">{state.error}</Notice>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 cursor-pointer items-center px-3 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
          >
            {pending
              ? t("procurement.detail.terminal.cancelling")
              : t("procurement.detail.terminal.cancelAction")}
          </button>
        </div>
      </form>
    </Card>
  );
}

function VoidForm({
  action,
  label,
  ariaLabel,
}: {
  action: Bound;
  label: string;
  ariaLabel: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <LineField label={t("procurement.detail.voidReason")} className="flex-1">
        <input
          name="reason"
          aria-label={ariaLabel}
          className="min-h-12 rounded-lg border border-control-border bg-card px-2 py-1 text-sm"
        />
      </LineField>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:opacity-50 rounded-lg transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10"
      >
        <Trash size={14} aria-hidden="true" />
        {label}
      </button>
      {(state.fieldErrors?.reason || state.error) && (
        <Notice tone="error" className="w-full">
          {state.fieldErrors?.reason ?? state.error}
        </Notice>
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
