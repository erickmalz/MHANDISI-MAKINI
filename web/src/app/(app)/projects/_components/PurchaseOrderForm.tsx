"use client";

import { useActionState, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { ActionState } from "@/lib/forms/action-helpers";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useT } from "@/lib/i18n/client";
import { STAGE_STATUS_LABEL } from "./status-labels";

type LineRow = {
  item: string;
  description: string;
  unit: string;
  qtyOrdered: string;
  unitPrice: string;
};

type StageOption = { id: string; name: string; seq: number; status: string };
type SupplierOption = { id: string; name: string; status: "active" | "inactive" };

const emptyLine: LineRow = {
  item: "",
  description: "",
  unit: "",
  qtyOrdered: "",
  unitPrice: "",
};

function toNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function PurchaseOrderForm({
  action,
  stages,
  defaultStageId,
  fixedStageName,
  suppliers,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Present on the create form — the engineer picks the stage this order is for. */
  stages?: StageOption[];
  defaultStageId?: string;
  /** Present on the edit form — the stage is frozen with the draft. */
  fixedStageName?: string;
  suppliers: SupplierOption[];
  initial?: {
    supplierId: string;
    expectedDeliveryOn?: string;
    paymentTerms?: string;
    notes?: string;
    lines: {
      item: string;
      description?: string;
      unit: string;
      qtyOrdered: number;
      unitPrice: number;
    }[];
  };
  submitLabel: string;
  cancelHref: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const [lines, setLines] = useState<LineRow[]>(
    initial && initial.lines.length
      ? initial.lines.map((l) => ({
          item: l.item,
          description: l.description ?? "",
          unit: l.unit,
          qtyOrdered: String(l.qtyOrdered),
          unitPrice: String(l.unitPrice),
        }))
      : [{ ...emptyLine }],
  );

  const parsed = lines
    .filter((l) => l.item.trim() !== "")
    .map((l) => ({
      item: l.item.trim(),
      description: l.description.trim() || null,
      unit: l.unit.trim(),
      qtyOrdered: toNumber(l.qtyOrdered),
      unitPrice: Math.round(toNumber(l.unitPrice)),
    }));

  const serialized = parsed.filter(
    (l) => l.qtyOrdered > 0 && l.unitPrice > 0 && l.unit !== "",
  );
  const orderedTotal = serialized.reduce(
    (s, l) => s + l.qtyOrdered * l.unitPrice,
    0,
  );

  const update = (i: number, patch: Partial<LineRow>) =>
    setLines((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(serialized)} />

      <Card className="flex flex-col gap-4">
        {fixedStageName ? (
          <p className="text-sm text-muted-foreground">
            {t("procurement.form.stage")}{" "}
            <span className="font-bold text-foreground">{fixedStageName}</span> —{" "}
            {t("procurement.form.stageFrozen")}
          </p>
        ) : (
          <Field label={t("procurement.form.stageThisFor")} required error={errors.stageId}>
            <select
              name="stageId"
              defaultValue={defaultStageId ?? stages?.[0]?.id ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              {(stages ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.seq}. {s.name} (
                  {STAGE_STATUS_LABEL[s.status] ? t(STAGE_STATUS_LABEL[s.status]) : s.status})
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field
          label={t("procurement.form.supplier")}
          required
          hint={t("procurement.form.supplierHint")}
          error={errors.supplierId}
        >
          <select
            name="supplierId"
            defaultValue={initial?.supplierId ?? suppliers[0]?.id ?? ""}
            className={`${controlClass} cursor-pointer`}
          >
            {suppliers.length === 0 && <option value="">{t("procurement.form.noSuppliers")}</option>}
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === "inactive" ? ` (${t("procurement.form.inactive")})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("procurement.form.expectedDelivery")} error={errors.expectedDeliveryOn}>
            <input
              name="expectedDeliveryOn"
              type="date"
              defaultValue={initial?.expectedDeliveryOn ?? ""}
              className={`${controlClass} cursor-pointer`}
            />
          </Field>
          <Field label={t("procurement.form.paymentTerms")} error={errors.paymentTerms}>
            <input
              name="paymentTerms"
              defaultValue={initial?.paymentTerms ?? ""}
              placeholder={t("procurement.form.paymentTermsPlaceholder")}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">{t("procurement.form.lines.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("procurement.form.lines.subtitle")}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {lines.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
            >
              <LineField label={t("procurement.form.item")} className="col-span-2 sm:col-span-2">
                <input
                  aria-label={t("procurement.form.materialItemAria")}
                  value={row.item}
                  onChange={(e) => update(i, { item: e.target.value })}
                  className={controlClass}
                />
              </LineField>
              <LineField label={t("procurement.form.unit")}>
                <input
                  aria-label={t("procurement.form.unit")}
                  value={row.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                  className={controlClass}
                />
              </LineField>
              <LineField label={t("procurement.form.quantity")}>
                <input
                  aria-label={t("procurement.form.quantityAria")}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  value={row.qtyOrdered}
                  onChange={(e) => update(i, { qtyOrdered: e.target.value })}
                  className={controlClass}
                />
              </LineField>
              <LineField label={t("procurement.form.unitPrice")}>
                <MoneyInput
                  aria-label={t("procurement.form.unitPrice")}
                  value={row.unitPrice}
                  onChange={(v) => update(i, { unitPrice: v })}
                />
              </LineField>
              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                <Money
                  amount={Math.round(
                    toNumber(row.qtyOrdered) * toNumber(row.unitPrice),
                  )}
                  className="text-sm font-bold text-card-foreground"
                />
                <button
                  type="button"
                  aria-label={t("procurement.form.removeLine", { number: i + 1 })}
                  onClick={() =>
                    setLines((prev) =>
                      prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                    )
                  }
                  className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
            className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            {t("procurement.form.lines.add")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("procurement.form.orderedTotal")}{" "}
            <Money
              amount={orderedTotal}
              className="font-bold text-card-foreground"
            />
          </span>
        </div>
      </Card>

      <Card>
        <Field label={t("procurement.form.notes")} error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder={t("procurement.form.notesPlaceholder")}
            className={`${controlClass} min-h-20`}
          />
        </Field>
      </Card>

      {errors.lines && (
        <Notice tone="error">{errors.lines}</Notice>
      )}
      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending || suppliers.length === 0}>
          {pending ? t("procurement.form.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("procurement.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
