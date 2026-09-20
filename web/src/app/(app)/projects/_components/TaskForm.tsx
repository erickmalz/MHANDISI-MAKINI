"use client";

import { useActionState, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { EditableTakeOffLine } from "@/lib/data";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { TaskInput } from "@/lib/validation/tasks";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatTZS } from "@/lib/finance";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import { TASK_STATUS_KEYS } from "./status-keys";

type LineRow = {
  /** Present only for a line that already exists in the database (Phase 3 ticket 03 §2) — a missing id tells the DAL to insert a new row. */
  id?: string;
  item: string;
  description: string;
  qty: string;
  unit: string;
  estUnitCost: string;
  /** The frozen Approved Estimate, before any revision — `null`/absent for a line with none yet. */
  qtyOriginal?: number | null;
  estUnitCostOriginal?: number | null;
  /**
   * "Apply from stock" (Phase 3 ticket 06 §4) — never persisted on the line
   * itself, so this always starts blank, even when editing an existing line.
   */
  applyFromStock: string;
};

/** A project's current Material Stock balance, as fed to this form (ticket 06 §6). */
export type StockBalanceOption = { itemKey: string; unit: string; qty: number };

function stockKey(item: string, unit: string): string {
  return `${item.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

const STATUSES: { value: TaskInput["status"]; labelKey: MessageKey }[] = (
  Object.keys(TASK_STATUS_KEYS) as (keyof typeof TASK_STATUS_KEYS)[]
).map((value) => ({ value, labelKey: TASK_STATUS_KEYS[value] }));

const emptyLine: LineRow = {
  item: "",
  description: "",
  qty: "",
  unit: "",
  estUnitCost: "",
  applyFromStock: "",
};

function toNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function TaskForm({
  action,
  subcontractors,
  initial,
  seq,
  submitLabel,
  cancelHref,
  labourOriginalAmount,
  budgetLocked = false,
  variationMaterialTotal,
  stockBalances = [],
  knownItems = [],
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subcontractors: { id: string; name: string }[];
  initial?: Partial<Omit<TaskInput, "lines">> & { lines?: EditableTakeOffLine[] };
  seq?: number;
  submitLabel: string;
  cancelHref: string;
  /** The labour agreement's first-ever value — shown once a revision has happened (Operational Control decision 3). */
  labourOriginalAmount?: number | null;
  /** The stage's Funding Request is issued/closed (Phase 3 ticket 03 §1/§2): item/unit freeze on an existing line; qty/cost edits become revisions instead of overwrites. */
  budgetLocked?: boolean;
  /** Σ estimate of this Task's Variation-appended material lines — shown separately, since those lines never appear here (ticket 03's cross-reference note). */
  variationMaterialTotal?: number;
  /** The project's current Material Stock balances (ticket 06 §6) — drives the "On site: {qty} {unit}" hint and the "Apply from stock" cap next to a matching line. */
  stockBalances?: StockBalanceOption[];
  /** Distinct known material item names for the item field's `<datalist>` autocomplete (ticket 06 §4/§6) — a typo-drift mitigation, not validation. */
  knownItems?: string[];
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const seededLines: LineRow[] = (initial?.lines ?? []).map((l) => ({
    id: l.id,
    item: l.item,
    description: l.description ?? "",
    qty: l.qty != null ? String(l.qty) : "",
    unit: l.unit,
    estUnitCost: l.estUnitCost != null ? String(l.estUnitCost) : "",
    qtyOriginal: l.qtyOriginal ?? null,
    estUnitCostOriginal: l.estUnitCostOriginal ?? null,
    // Never persisted on the line (ticket 06 §4) — always starts blank, even
    // when editing an existing line.
    applyFromStock: "",
  }));
  const [lines, setLines] = useState<LineRow[]>(
    seededLines.length ? seededLines : [{ ...emptyLine }],
  );

  const stockByKey = new Map(stockBalances.map((b) => [`${b.itemKey}::${b.unit}`, b.qty]));
  const stockFor = (l: LineRow): number => stockByKey.get(stockKey(l.item, l.unit)) ?? 0;
  const maxApplyFromStock = (l: LineRow): number => {
    const balance = stockFor(l);
    const required = l.qty.trim() ? toNumber(l.qty) : balance;
    return Math.max(0, Math.min(required, balance));
  };

  const serialized = lines
    .filter((l) => l.item.trim() !== "")
    .map((l) => ({
      id: l.id,
      item: l.item.trim(),
      description: l.description.trim() || undefined,
      qty: l.qty.trim() ? toNumber(l.qty) : undefined,
      unit: l.unit.trim(),
      estUnitCost: l.estUnitCost.trim() ? Math.round(toNumber(l.estUnitCost)) : undefined,
      applyFromStock: l.applyFromStock.trim()
        ? Math.min(toNumber(l.applyFromStock), maxApplyFromStock(l))
        : undefined,
    }));

  const lineTotal = (l: LineRow) =>
    l.qty.trim() && l.estUnitCost.trim()
      ? Math.round(toNumber(l.qty) * toNumber(l.estUnitCost))
      : 0;
  const materialEstimate = lines.reduce((s, l) => s + lineTotal(l), 0);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(serialized)} />
      {/* Typo-drift mitigation only (ticket 06 §4/§6) — not validated against. */}
      <datalist id="material-item-options">
        {knownItems.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      <Card className="flex flex-col gap-4">
        {seq != null && (
          <p className="text-sm text-muted-foreground">
            {t("forms.task.seqNote", { seq })}
          </p>
        )}

        <Field label={t("forms.task.description")} required error={errors.description}>
          <input
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder={t("forms.task.descriptionPlaceholder")}
            className={controlClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("forms.task.subcontractor")} error={errors.subcontractorId}>
            <select
              name="subcontractorId"
              defaultValue={initial?.subcontractorId ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              <option value="">{t("forms.task.unassigned")}</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t("forms.task.labourAgreement")}
            hint={
              budgetLocked
                ? t("forms.task.labourHintLocked")
                : labourOriginalAmount != null
                  ? t("forms.task.labourHintOriginal", { amount: labourOriginalAmount.toLocaleString("en-US") })
                  : t("forms.task.labourHint")
            }
            error={errors.labourAmount}
          >
            <MoneyInput
              name="labourAmount"
              defaultValue={initial?.labourAmount ?? ""}
              readOnly={budgetLocked}
              className={budgetLocked ? "cursor-not-allowed opacity-70" : ""}
            />
          </Field>
          <Field label={t("forms.common.status")} error={errors.status}>
            <select
              name="status"
              defaultValue={initial?.status ?? "planned"}
              className={`${controlClass} cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("forms.common.progressPercent")} error={errors.progressPercent}>
            <input
              name="progressPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={initial?.progressPercent ?? 0}
              className={controlClass}
            />
          </Field>
          <Field label={t("forms.common.startedOn")} error={errors.startedOn}>
            <input
              name="startedOn"
              type="date"
              defaultValue={initial?.startedOn ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label={t("forms.common.completedOn")} error={errors.completedOn}>
            <input
              name="completedOn"
              type="date"
              defaultValue={initial?.completedOn ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label={t("forms.common.notes")} error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className={`${controlClass} min-h-20`}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">
            {t("forms.task.takeOff.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {budgetLocked
              ? t("forms.task.takeOff.introLocked")
              : t("forms.task.takeOff.intro")}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {lines.map((row, i) => {
            // Item/unit freeze once a line has existed since before lock —
            // a brand-new line (no id yet) added after lock is fully
            // editable (ticket 03 §2).
            const identityLocked = budgetLocked && Boolean(row.id);
            const wasRevised =
              row.id != null &&
              (row.qtyOriginal != null || row.estUnitCostOriginal != null) &&
              (toNumber(row.qty) !== (row.qtyOriginal ?? 0) ||
                toNumber(row.estUnitCost) !== (row.estUnitCostOriginal ?? 0));
            return (
              <li
                key={row.id ?? `new-${i}`}
                className="rounded-lg border border-border p-3"
              >
                <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
                  <LineField label={t("forms.task.item")} className="col-span-2 sm:col-span-2">
                    <input
                      aria-label={t("forms.task.ariaItem", { n: i + 1 })}
                      list="material-item-options"
                      value={row.item}
                      readOnly={identityLocked}
                      onChange={(e) =>
                        setLines(lines.map((r, j) => (j === i ? { ...r, item: e.target.value } : r)))
                      }
                      className={`${controlClass} ${identityLocked ? "cursor-not-allowed opacity-70" : ""}`}
                    />
                  </LineField>
                  <LineField label={t("forms.task.quantity")}>
                    <input
                      aria-label={t("forms.task.ariaQuantity", { n: i + 1 })}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.001"
                      value={row.qty}
                      onChange={(e) =>
                        setLines(lines.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))
                      }
                      className={controlClass}
                    />
                  </LineField>
                  <LineField label={t("forms.task.unit")}>
                    <input
                      aria-label={t("forms.task.ariaUnit", { n: i + 1 })}
                      value={row.unit}
                      readOnly={identityLocked}
                      onChange={(e) =>
                        setLines(lines.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))
                      }
                      className={`${controlClass} ${identityLocked ? "cursor-not-allowed opacity-70" : ""}`}
                    />
                  </LineField>
                  <LineField label={t("forms.task.unitCost")}>
                    <MoneyInput
                      aria-label={t("forms.task.ariaUnitCost", { n: i + 1 })}
                      value={row.estUnitCost}
                      onChange={(v) =>
                        setLines(
                          lines.map((r, j) => (j === i ? { ...r, estUnitCost: v } : r)),
                        )
                      }
                    />
                  </LineField>
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                    <Money
                      amount={lineTotal(row)}
                      className="text-sm font-bold text-card-foreground"
                    />
                    <button
                      type="button"
                      aria-label={t("forms.task.ariaRemove", { n: i + 1 })}
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
                    >
                      <Trash size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {wasRevised && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("forms.task.original", { qty: row.qtyOriginal ?? "—", unit: row.unit })}{" "}
                    <Money amount={row.estUnitCostOriginal ?? 0} className="text-sm" />
                  </p>
                )}
                {stockFor(row) > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {t("forms.task.onSite", { qty: stockFor(row), unit: row.unit })}
                    </span>
                    <label className="flex items-center gap-1.5 text-muted-foreground">
                      {t("forms.task.applyFromStock")}
                      <input
                        aria-label={t("forms.task.ariaApplyFromStock", { n: i + 1 })}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={maxApplyFromStock(row)}
                        step="0.001"
                        placeholder="0"
                        value={row.applyFromStock}
                        onChange={(e) => {
                          const capped = Math.max(
                            0,
                            Math.min(toNumber(e.target.value), maxApplyFromStock(row)),
                          );
                          setLines(
                            lines.map((r, j) =>
                              j === i
                                ? { ...r, applyFromStock: e.target.value === "" ? "" : String(capped) }
                                : r,
                            ),
                          );
                        }}
                        className="min-h-12 w-24 rounded-lg border border-control-border bg-card px-2 text-card-foreground"
                      />
                      {row.unit}
                    </label>
                  </div>
                )}
              </li>
            );
          })}
          {lines.length === 0 && (
            <li className="text-sm text-muted-foreground">{t("forms.task.noLines")}</li>
          )}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setLines([...lines, { ...emptyLine }])}
            className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            {t("forms.task.addLine")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("forms.task.estimatedCost")}{" "}
            <Money amount={materialEstimate} className="font-bold text-card-foreground" />
          </span>
        </div>
        {!!variationMaterialTotal && (
          <p className="text-sm text-muted-foreground">
            {t("forms.task.variationPlus", { amount: formatTZS(variationMaterialTotal) })}
          </p>
        )}
        {errors.lines && (
          <Notice tone="error">{errors.lines}</Notice>
        )}
      </Card>

      {state.error && (
        <Notice tone="error">{state.error}</Notice>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? t("forms.common.saving") : submitLabel}
        </Button>
        <Button variant="ghost" href={cancelHref}>
          {t("forms.common.cancel")}
        </Button>
      </div>
    </form>
  );
}
