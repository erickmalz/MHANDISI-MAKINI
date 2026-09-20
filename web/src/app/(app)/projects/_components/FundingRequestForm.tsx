"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, controlClass } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { FundingRequestLine } from "@/lib/funding";

type MaterialRow = { item: string; qty: string; unit: string; unitCost: string };
type LumpRow = { item: string; amount: string };

type StageOption = { id: string; name: string; seq: number; status: string };

const emptyMaterial: MaterialRow = { item: "", qty: "", unit: "", unitCost: "" };
const emptyLump: LumpRow = { item: "", amount: "" };

function toNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function splitInitial(lines: FundingRequestLine[]) {
  const material: MaterialRow[] = [];
  const labour: LumpRow[] = [];
  const other: LumpRow[] = [];
  for (const l of lines) {
    if (l.category === "material") {
      material.push({
        item: l.item,
        qty: l.qty != null ? String(l.qty) : "",
        unit: l.unit ?? "",
        unitCost: l.unitCost != null ? String(l.unitCost) : String(l.amount),
      });
    } else if (l.category === "labour") {
      labour.push({ item: l.item, amount: String(l.amount) });
    } else if (l.category === "other") {
      other.push({ item: l.item, amount: String(l.amount) });
    }
  }
  return { material, labour, other };
}

export function FundingRequestForm({
  action,
  stages,
  defaultStageId,
  fixedStageName,
  initial,
  submitLabel,
  cancelHref,
  variationLinks,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Present on the create form — the engineer picks the stage to fund. */
  stages?: StageOption[];
  defaultStageId?: string;
  /** Present on the edit form — the stage is frozen with the draft. */
  fixedStageName?: string;
  initial?: {
    notes?: string;
    paymentInstructions?: string;
    lines: FundingRequestLine[];
  };
  submitLabel: string;
  cancelHref: string;
  /**
   * Approved Variations this Additional Funding Request is being raised for
   * (Phase 3 ticket 01 §4) — posted as a hidden field and linked, purely
   * informationally, once the draft is saved. Never required.
   */
  variationLinks?: { id: string; displayNumber: string | null; description: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const seed = initial
    ? splitInitial(initial.lines)
    : { material: [{ ...emptyMaterial }], labour: [{ ...emptyLump }], other: [] as LumpRow[] };

  const [material, setMaterial] = useState<MaterialRow[]>(
    seed.material.length ? seed.material : [{ ...emptyMaterial }],
  );
  const [labour, setLabour] = useState<LumpRow[]>(seed.labour);
  const [other, setOther] = useState<LumpRow[]>(seed.other);

  const materialLines = material
    .filter((r) => r.item.trim() !== "")
    .map((r) => ({
      category: "material" as const,
      item: r.item.trim(),
      description: null,
      qty: toNumber(r.qty) || null,
      unit: r.unit.trim() || null,
      unitCost: Math.round(toNumber(r.unitCost)) || null,
      amount: Math.round(toNumber(r.qty) * toNumber(r.unitCost)),
    }));
  const lumpLines = (rows: LumpRow[], category: "labour" | "other") =>
    rows
      .filter((r) => r.item.trim() !== "")
      .map((r) => ({
        category,
        item: r.item.trim(),
        description: null,
        qty: null,
        unit: null,
        unitCost: null,
        amount: Math.round(toNumber(r.amount)),
      }));

  const serialized = [
    ...materialLines,
    ...lumpLines(labour, "labour"),
    ...lumpLines(other, "other"),
  ].filter((l) => l.amount > 0);

  const materialSubtotal = materialLines.reduce((s, l) => s + l.amount, 0);
  const labourSubtotal = lumpLines(labour, "labour").reduce((s, l) => s + l.amount, 0);
  const otherSubtotal = lumpLines(other, "other").reduce((s, l) => s + l.amount, 0);
  const depositTarget = materialSubtotal + labourSubtotal + otherSubtotal;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(serialized)} />
      {variationLinks && variationLinks.length > 0 && (
        <input
          type="hidden"
          name="variationIds"
          value={JSON.stringify(variationLinks.map((v) => v.id))}
        />
      )}

      {variationLinks && variationLinks.length > 0 && (
        <Card>
          <p className="text-sm font-bold text-card-foreground">
            Raised for {variationLinks.length === 1 ? "this Variation" : "these Variations"}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {variationLinks.map((v) => (
              <li key={v.id}>
                {v.displayNumber ?? "Draft"} — {v.description}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {fixedStageName ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Stage <span className="font-bold text-foreground">{fixedStageName}</span>{" "}
            — frozen with this request.
          </p>
        </Card>
      ) : (
        <Card>
          <Field label="Stage to fund" required error={errors.stageId}>
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
        </Card>
      )}

      <RowEditor
        title="Materials"
        subtitle="Quantity × unit cost. Lump-sum items go under “Other costs”."
        addLabel="Add material line"
        rows={material}
        onChange={setMaterial}
        makeEmpty={() => ({ ...emptyMaterial })}
        render={(row, update) => (
          <>
            <input
              aria-label="Material item"
              placeholder="Item"
              value={row.item}
              onChange={(e) => update({ item: e.target.value })}
              className={`${controlClass} sm:col-span-2`}
            />
            <input
              aria-label="Quantity"
              type="number"
              min={0}
              step="0.001"
              placeholder="Qty"
              value={row.qty}
              onChange={(e) => update({ qty: e.target.value })}
              className={controlClass}
            />
            <input
              aria-label="Unit"
              placeholder="Unit"
              value={row.unit}
              onChange={(e) => update({ unit: e.target.value })}
              className={controlClass}
            />
            <input
              aria-label="Unit cost (TZS)"
              type="number"
              min={0}
              placeholder="Unit cost"
              value={row.unitCost}
              onChange={(e) => update({ unitCost: e.target.value })}
              className={controlClass}
            />
          </>
        )}
        lineTotal={(row) => Math.round(toNumber(row.qty) * toNumber(row.unitCost))}
        subtotal={materialSubtotal}
      />

      <RowEditor
        title="Labour"
        subtitle="One lump-sum amount per subcontractor or crew."
        addLabel="Add labour line"
        rows={labour}
        onChange={setLabour}
        makeEmpty={() => ({ ...emptyLump })}
        render={(row, update) => (
          <>
            <input
              aria-label="Labour item"
              placeholder="Subcontractor / scope"
              value={row.item}
              onChange={(e) => update({ item: e.target.value })}
              className={`${controlClass} sm:col-span-4`}
            />
            <input
              aria-label="Amount (TZS)"
              type="number"
              min={0}
              placeholder="Amount"
              value={row.amount}
              onChange={(e) => update({ amount: e.target.value })}
              className={controlClass}
            />
          </>
        )}
        lineTotal={(row) => Math.round(toNumber(row.amount))}
        subtotal={labourSubtotal}
      />

      <RowEditor
        title="Other costs"
        subtitle="Anything else the client funds for this stage (optional)."
        addLabel="Add other line"
        rows={other}
        onChange={setOther}
        makeEmpty={() => ({ ...emptyLump })}
        render={(row, update) => (
          <>
            <input
              aria-label="Other item"
              placeholder="Description"
              value={row.item}
              onChange={(e) => update({ item: e.target.value })}
              className={`${controlClass} sm:col-span-4`}
            />
            <input
              aria-label="Amount (TZS)"
              type="number"
              min={0}
              placeholder="Amount"
              value={row.amount}
              onChange={(e) => update({ amount: e.target.value })}
              className={controlClass}
            />
          </>
        )}
        lineTotal={(row) => Math.round(toNumber(row.amount))}
        subtotal={otherSubtotal}
      />

      <Card className="flex items-center justify-between gap-3">
        <span className="font-bold text-card-foreground">
          Deposit requested (materials + labour + other)
        </span>
        <Money
          amount={depositTarget}
          className="text-lg font-bold text-card-foreground"
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label="Payment instructions" error={errors.paymentInstructions}>
          <textarea
            name="paymentInstructions"
            rows={2}
            defaultValue={initial?.paymentInstructions ?? ""}
            placeholder="Bank transfer, mobile money or cheque — account details on file with the client."
            className={`${controlClass} min-h-16`}
          />
        </Field>
        <Field label="Notes for the client" error={errors.notes}>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
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

function RowEditor<Row>({
  title,
  subtitle,
  addLabel,
  rows,
  onChange,
  makeEmpty,
  render,
  lineTotal,
  subtotal,
}: {
  title: string;
  subtitle: string;
  addLabel: string;
  rows: Row[];
  onChange: (next: Row[]) => void;
  makeEmpty: () => Row;
  render: (row: Row, update: (patch: Partial<Row>) => void) => React.ReactNode;
  lineTotal: (row: Row) => number;
  subtotal: number;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
          >
            {render(row, (patch) =>
              onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))),
            )}
            <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
              <Money
                amount={lineTotal(row)}
                className="text-sm font-bold text-card-foreground"
              />
              <button
                type="button"
                aria-label={`Remove ${title} line ${i + 1}`}
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
                className="cursor-pointer text-muted-foreground hover:text-destructive rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-destructive"
              >
                <Trash size={16} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-muted-foreground">No lines yet.</li>
        )}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange([...rows, makeEmpty()])}
          className="inline-flex min-h-12 cursor-pointer items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
        >
          <Plus size={16} aria-hidden="true" />
          {addLabel}
        </button>
        <span className="text-sm text-muted-foreground">
          Subtotal <Money amount={subtotal} className="font-bold text-card-foreground" />
        </span>
      </div>
    </Card>
  );
}
