"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { TaskInput } from "@/lib/validation/tasks";

type LineRow = {
  item: string;
  description: string;
  qty: string;
  unit: string;
  estUnitCost: string;
};

const STATUSES: { value: TaskInput["status"]; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const emptyLine: LineRow = { item: "", description: "", qty: "", unit: "", estUnitCost: "" };

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
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subcontractors: { id: string; name: string }[];
  initial?: Partial<TaskInput>;
  seq?: number;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const seededLines: LineRow[] = (initial?.lines ?? []).map((l) => ({
    item: l.item,
    description: l.description ?? "",
    qty: l.qty != null ? String(l.qty) : "",
    unit: l.unit,
    estUnitCost: l.estUnitCost != null ? String(l.estUnitCost) : "",
  }));
  const [lines, setLines] = useState<LineRow[]>(
    seededLines.length ? seededLines : [{ ...emptyLine }],
  );

  const serialized = lines
    .filter((l) => l.item.trim() !== "")
    .map((l) => ({
      item: l.item.trim(),
      description: l.description.trim() || undefined,
      qty: l.qty.trim() ? toNumber(l.qty) : undefined,
      unit: l.unit.trim(),
      estUnitCost: l.estUnitCost.trim() ? Math.round(toNumber(l.estUnitCost)) : undefined,
    }));

  const lineTotal = (l: LineRow) =>
    l.qty.trim() && l.estUnitCost.trim()
      ? Math.round(toNumber(l.qty) * toNumber(l.estUnitCost))
      : 0;
  const materialEstimate = lines.reduce((s, l) => s + lineTotal(l), 0);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(serialized)} />

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
            hint="The agreed price for this subcontractor's work. Reduces Available Float once set."
            error={errors.labourAmount}
          >
            <input
              name="labourAmount"
              type="number"
              min={0}
              defaultValue={initial?.labourAmount ?? ""}
              className={controlClass}
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
            Your material estimate for this task. Optional now — it feeds Material
            Variance at closeout and pre-fills purchase orders.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {lines.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
            >
              <input
                aria-label={`Material item, line ${i + 1}`}
                placeholder="Item"
                value={row.item}
                onChange={(e) =>
                  setLines(lines.map((r, j) => (j === i ? { ...r, item: e.target.value } : r)))
                }
                className={`${controlClass} sm:col-span-2`}
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
                onChange={(e) =>
                  setLines(lines.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))
                }
                className={controlClass}
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
            </li>
          ))}
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
