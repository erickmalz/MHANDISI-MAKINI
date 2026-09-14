"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { EditableTakeOffLine } from "@/lib/data";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { TaskInput } from "@/lib/validation/tasks";

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

const STATUSES: { value: TaskInput["status"]; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
            Task <span className="font-bold text-foreground">{seq}</span> in this
            stage.
          </p>
        )}

        <Field label="Task description" required error={errors.description}>
          <input
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="e.g. Ground-floor blockwork up to ring beam"
            className={controlClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Subcontractor" error={errors.subcontractorId}>
            <select
              name="subcontractorId"
              defaultValue={initial?.subcontractorId ?? ""}
              className={`${controlClass} cursor-pointer`}
            >
              <option value="">Unassigned</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Labour agreement (TZS)"
            hint={
              budgetLocked
                ? "Locked — this stage's Funding Request has been issued. A real change goes through superseding it instead."
                : labourOriginalAmount != null
                  ? `The agreed price for this subcontractor's work. Reduces Available Float once set. Original: ${labourOriginalAmount.toLocaleString("en-US")}.`
                  : "The agreed price for this subcontractor's work. Reduces Available Float once set."
            }
            error={errors.labourAmount}
          >
            <input
              name="labourAmount"
              type="number"
              min={0}
              defaultValue={initial?.labourAmount ?? ""}
              readOnly={budgetLocked}
              className={`${controlClass} ${budgetLocked ? "cursor-not-allowed opacity-70" : ""}`}
            />
          </Field>
          <Field label="Status" error={errors.status}>
            <select
              name="status"
              defaultValue={initial?.status ?? "planned"}
              className={`${controlClass} cursor-pointer`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Progress (%)" error={errors.progressPercent}>
            <input
              name="progressPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={initial?.progressPercent ?? 0}
              className={controlClass}
            />
          </Field>
          <Field label="Started on" error={errors.startedOn}>
            <input
              name="startedOn"
              type="date"
              defaultValue={initial?.startedOn ?? ""}
              className={controlClass}
            />
          </Field>
          <Field label="Completed on" error={errors.completedOn}>
            <input
              name="completedOn"
              type="date"
              defaultValue={initial?.completedOn ?? ""}
              className={controlClass}
            />
          </Field>
        </div>

        <Field label="Notes" error={errors.notes}>
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
            Material take-off
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {budgetLocked
              ? "Locked — this stage's Funding Request has been issued, so item name and unit are frozen as the Approved Estimate. Change a quantity or cost to record a revision, remove a line to drop it, or add a new one."
              : "Your material estimate for this task. Optional now — it feeds Material Variance at closeout and pre-fills purchase orders."}
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
                <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
                  <input
                    aria-label={`Material item, line ${i + 1}`}
                    placeholder="Item"
                    list="material-item-options"
                    value={row.item}
                    readOnly={identityLocked}
                    onChange={(e) =>
                      setLines(lines.map((r, j) => (j === i ? { ...r, item: e.target.value } : r)))
                    }
                    className={`${controlClass} sm:col-span-2 ${identityLocked ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                  <input
                    aria-label={`Quantity, line ${i + 1}`}
                    type="number"
                    min={0}
                    step="0.001"
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) =>
                      setLines(lines.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))
                    }
                    className={controlClass}
                  />
                  <input
                    aria-label={`Unit, line ${i + 1}`}
                    placeholder="Unit"
                    value={row.unit}
                    readOnly={identityLocked}
                    onChange={(e) =>
                      setLines(lines.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))
                    }
                    className={`${controlClass} ${identityLocked ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                  <input
                    aria-label={`Estimated unit cost, line ${i + 1}`}
                    type="number"
                    min={0}
                    placeholder="Unit cost"
                    value={row.estUnitCost}
                    onChange={(e) =>
                      setLines(
                        lines.map((r, j) => (j === i ? { ...r, estUnitCost: e.target.value } : r)),
                      )
                    }
                    className={controlClass}
                  />
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                    <Money
                      amount={lineTotal(row)}
                      className="text-sm font-bold text-card-foreground"
                    />
                    <button
                      type="button"
                      aria-label={`Remove material line ${i + 1}`}
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                    >
                      <Trash size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {wasRevised && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Original: {row.qtyOriginal ?? "—"} {row.unit} @{" "}
                    <Money amount={row.estUnitCostOriginal ?? 0} className="text-xs" />
                  </p>
                )}
                {stockFor(row) > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                    <span className="text-muted-foreground">
                      On site: <span className="font-bold text-card-foreground">{stockFor(row)}</span>{" "}
                      {row.unit}
                    </span>
                    <label className="flex items-center gap-1.5 text-muted-foreground">
                      Apply from stock
                      <input
                        aria-label={`Apply from stock, line ${i + 1}`}
                        type="number"
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
                        className="w-20 rounded border border-border bg-card px-1.5 py-0.5 text-card-foreground"
                      />
                      {row.unit}
                    </label>
                  </div>
                )}
              </li>
            );
          })}
          {lines.length === 0 && (
            <li className="text-sm text-muted-foreground">No material lines yet.</li>
          )}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setLines([...lines, { ...emptyLine }])}
            className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            Add material line
          </button>
          <span className="text-sm text-muted-foreground">
            Estimated material cost{" "}
            <Money amount={materialEstimate} className="font-bold text-card-foreground" />
          </span>
        </div>
        {!!variationMaterialTotal && (
          <p className="text-sm text-muted-foreground">
            Plus{" "}
            <Money amount={variationMaterialTotal} className="font-bold text-card-foreground" />{" "}
            from approved Variations (recorded separately — see the Variation).
          </p>
        )}
        {errors.lines && (
          <p className="text-sm font-bold text-destructive">{errors.lines}</p>
        )}
      </Card>

      {state.error && (
        <p className="text-sm font-bold text-destructive">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
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
