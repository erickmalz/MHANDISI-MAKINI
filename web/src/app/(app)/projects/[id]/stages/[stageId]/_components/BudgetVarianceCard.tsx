import type { StageFinancials } from "@/lib/types";
import {
  budgetVarianceTotal,
  labourVariance,
  materialVariance,
} from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";

/**
 * Budget Variance Analysis (Phase 3 ticket 03 §3/§4) — added to the existing
 * Stage detail page, not a new route: Material Variance (Total Estimated
 * Material Cost vs. `paidPurchases`, stage-level — no per-line PO matching)
 * side by side with Labour Variance (the stage's current labour agreement
 * total vs. Labour Paid), plus a combined total. Positive = saving.
 *
 * `accumulatedMaterialVariance` is ticket 03 §5's "credited to Petty Cash"
 * figure — Σ Material Variance across every stage of the *project*, derived
 * live, never stored (Petty Cash was never a separately tracked balance).
 */
export async function BudgetVarianceCard({
  f,
  accumulatedMaterialVariance,
}: {
  f: StageFinancials;
  accumulatedMaterialVariance: number;
}) {
  const t = await getT();
  const material = materialVariance(f);
  const labour = labourVariance(f);
  const total = budgetVarianceTotal(f);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">
          {t("stages.budget.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("stages.budget.intro")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <VarianceColumn
          title={t("stages.budget.material")}
          estimatedLabel={t("stages.budget.estimated")}
          estimated={f.materialEstimated}
          actualLabel={t("stages.budget.actual")}
          actual={f.paidPurchases}
          variance={material}
          varianceLabel={t("stages.budget.variance")}
        />
        <VarianceColumn
          title={t("stages.budget.labour")}
          estimatedLabel={t("stages.budget.agreement")}
          estimated={f.labourAgreementTotal}
          actualLabel={t("stages.budget.paid")}
          actual={f.labourPayments}
          variance={labour}
          varianceLabel={t("stages.budget.variance")}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm font-bold text-muted-foreground">
          {t("stages.budget.combined")}
        </span>
        <VarianceMoney amount={total} className="text-lg" />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {t("stages.budget.accumulated")}
        </span>
        <VarianceMoney amount={accumulatedMaterialVariance} className="text-sm" />
      </div>
    </Card>
  );
}

function VarianceColumn({
  title,
  estimatedLabel,
  estimated,
  actualLabel,
  actual,
  variance,
  varianceLabel,
}: {
  title: string;
  estimatedLabel: string;
  estimated: number;
  actualLabel: string;
  actual: number;
  variance: number;
  varianceLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-bold text-card-foreground">{title}</h3>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{estimatedLabel}</span>
        <Money amount={estimated} className="font-bold text-card-foreground" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{actualLabel}</span>
        <Money amount={actual} className="font-bold text-card-foreground" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-sm">
        <span className="font-bold text-muted-foreground">{varianceLabel}</span>
        <VarianceMoney amount={variance} />
      </div>
    </div>
  );
}

/** Positive (a saving) reads green; negative (an overspend) reads red — `Money` already prefixes the sign. */
function VarianceMoney({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <Money
      amount={amount}
      className={`shrink-0 whitespace-nowrap font-bold text-health-green ${className}`}
      negativeClassName={`shrink-0 whitespace-nowrap font-bold text-destructive ${className}`}
    />
  );
}
