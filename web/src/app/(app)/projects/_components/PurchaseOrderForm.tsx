"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { ActionState } from "@/lib/forms/action-helpers";

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
            Stage <span className="font-bold text-foreground">{fixedStageName}</span>{" "}
            — frozen with this order.
          </p>
        ) : (
          <Field label="Stage this order is for" required error={errors.stageId}>
            <select
              name="stageId"
              defaultValue={defaultStageId ?? stages?.[0]?.id ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              {(stages ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.seq}. {s.name} ({s.status})
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field
          label="Supplier"
          required
          hint="From the Supplier Register. Add a supplier there first if it is missing."
          error={errors.supplierId}
        >
          <select
            name="supplierId"
            defaultValue={initial?.supplierId ?? suppliers[0]?.id ?? ""}
            className={`${controlClass} cursor-pointer`}
          >
            {suppliers.length === 0 && <option value="">No suppliers yet</option>}
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === "inactive" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Expected delivery date" error={errors.expectedDeliveryOn}>
            <input
              name="expectedDeliveryOn"
              type="date"
              defaultValue={initial?.expectedDeliveryOn ?? ""}
              className={`${controlClass} cursor-pointer`}
            />
          </Field>
          <Field label="Payment terms" error={errors.paymentTerms}>
            <input
              name="paymentTerms"
              defaultValue={initial?.paymentTerms ?? ""}
              placeholder="e.g. 50% deposit, balance on delivery"
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">Material lines</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quantity ordered × unit price. These are frozen when the order is issued.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {lines.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
            >
              <input
                aria-label="Material item"
                placeholder="Item"
                value={row.item}
                onChange={(e) => update(i, { item: e.target.value })}
                className={`${controlClass} sm:col-span-2`}
              />
              <input
                aria-label="Unit"
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                className={controlClass}
              />
              <input
                aria-label="Quantity ordered"
                type="number"
                min={0}
                step="0.001"
                placeholder="Qty"
                value={row.qtyOrdered}
                onChange={(e) => update(i, { qtyOrdered: e.target.value })}
                className={controlClass}
              />
              <input
                aria-label="Unit price (TZS)"
                type="number"
                min={0}
                placeholder="Unit price"
                value={row.unitPrice}
                onChange={(e) => update(i, { unitPrice: e.target.value })}
                className={controlClass}
              />
              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                <Money
                  amount={Math.round(
                    toNumber(row.qtyOrdered) * toNumber(row.unitPrice),
                  )}
                  className="text-sm font-bold text-card-foreground"
                />
                <button
                  type="button"
                  aria-label={`Remove line ${i + 1}`}
                  onClick={() =>
                    setLines((prev) =>
                      prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                    )
                  }
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
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
            className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            Add material line
          </button>
          <span className="text-sm text-muted-foreground">
            Ordered total{" "}
            <Money
              amount={orderedTotal}
              className="font-bold text-card-foreground"
            />
          </span>
        </div>
      </Card>

      <Card>
        <Field label="Notes" error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder="Anything the supplier or site team needs to know."
            className={`${controlClass} min-h-20`}
          />
        </Field>
      </Card>

      {errors.lines && (
        <p className="text-sm font-bold text-destructive">{errors.lines}</p>
      )}
      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending || suppliers.length === 0}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-12 items-center px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
