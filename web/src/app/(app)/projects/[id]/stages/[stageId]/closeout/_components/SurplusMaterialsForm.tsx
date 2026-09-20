"use client";

import { useActionState, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/Field";
import type { StockBalance } from "@/lib/data";
import type { ActionState } from "@/lib/forms/action-helpers";
import type { SurplusLineInput } from "@/lib/validation/stage-closeout";
import { Notice } from "@/components/ui/Notice";
import { LineField } from "@/components/ui/LineField";
import { useT } from "@/lib/i18n/client";

type LineRow = {
  item: string;
  unit: string;
  qty: string;
  resolution: SurplusLineInput["resolution"];
};

const emptyLine: LineRow = { item: "", unit: "", qty: "", resolution: "carry_forward" };

/**
 * "Carry Forward Surplus" — the post-closeout Materials action (ticket 05
 * §3): the Engineer names each on-site surplus line left over from this
 * stage and resolves it to Carried Forward (added to the project's Material
 * Stock, ticket 06 §3) or Written Off (ticket 06 §5 — only ever decrements
 * stock already on hand from an earlier carry-forward; a fresh surplus
 * written off here touches nothing). One submit records every line in a
 * single transaction (`resolveSurplusMaterials`).
 */
export function SurplusMaterialsForm({
  action,
  stock,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  stock: StockBalance[];
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {});
  const [lines, setLines] = useState<LineRow[]>([{ ...emptyLine }]);

  const usableLines = lines.filter(
    (l) => l.item.trim() !== "" && l.unit.trim() !== "" && l.qty.trim() !== "",
  );
  const serialized = JSON.stringify(
    usableLines.map((l) => ({ ...l, qty: Number(l.qty) || 0 })),
  );

  function updateLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-card-foreground">
          {t("closeout.surplus.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("closeout.surplus.intro")}
        </p>
      </div>

      {stock.length > 0 && (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <p className="mb-1 font-bold text-card-foreground">
            {t("closeout.surplus.onSite")}
          </p>
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {stock.map((s) => (
              <li key={`${s.itemKey}::${s.unit}`} className="capitalize">
                {s.itemKey} — {s.qty} {s.unit}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="lines" value={serialized} />

        <div className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
            >
              <LineField label={t("closeout.surplus.material")}>
              <input
                value={line.item}
                onChange={(e) => updateLine(i, { item: e.target.value })}
                className={controlClass}
                placeholder={t("closeout.surplus.materialPlaceholder")}
              />
              </LineField>
              <LineField label={t("closeout.surplus.unit")}>
              <input
                value={line.unit}
                onChange={(e) => updateLine(i, { unit: e.target.value })}
                className={controlClass}
                placeholder={t("closeout.surplus.unitPlaceholder")}
              />
              </LineField>
              <LineField label={t("closeout.surplus.quantity")}>
              <input
                type="number"
                min={0}
                step="any"
                value={line.qty}
                onChange={(e) => updateLine(i, { qty: e.target.value })}
                className={controlClass}
              />
              </LineField>
              <LineField label={t("closeout.surplus.resolution")}>
              <select
                value={line.resolution}
                onChange={(e) =>
                  updateLine(i, { resolution: e.target.value as LineRow["resolution"] })
                }
                className={`${controlClass} cursor-pointer`}
              >
                <option value="carry_forward">{t("closeout.surplus.carried")}</option>
                <option value="written_off">{t("closeout.surplus.writtenOff")}</option>
              </select>
              </LineField>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={lines.length === 1}
                className="inline-flex min-h-12 items-center justify-center gap-1 px-2 text-sm font-bold text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash size={16} aria-hidden="true" />
                {t("closeout.surplus.remove")}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
          className="inline-flex min-h-12 w-fit items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <Plus size={18} aria-hidden="true" />
          {t("closeout.surplus.add")}
        </button>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.fieldErrors?.lines && (
          <Notice tone="error">{state.fieldErrors.lines}</Notice>
        )}

        <div>
          <Button variant="primary" type="submit" disabled={pending || usableLines.length === 0}>
            {pending ? t("closeout.surplus.recording") : t("closeout.surplus.record")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
