import type { StageFinancials } from "@/lib/types";
import {
  budgetVarianceTotal,
  labourVariance,
  materialVariance,
} from "@/lib/finance";
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
export function BudgetVarianceCard({
  f,
  accumulatedMaterialVariance,
}: {
  f: StageFinancials;
  accumulatedMaterialVariance: number;
}) {
  const material = materialVariance(f);
  const labour = labourVariance(f);
  const total = budgetVarianceTotal(f);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">
          Budget Variance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The Approved Estimate against what has actually been spent, for
          this stage. Positive = a saving; negative = an overspend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <VarianceColumn
          title="Material"
          estimatedLabel="Estimated"
          estimated={f.materialEstimated}
          actualLabel="Actual"
          actual={f.paidPurchases}
          variance={material}
        />
        <VarianceColumn
          title="Labour"
          estimatedLabel="Agreement"
          estimated={f.labourAgreementTotal}
          actualLabel="Paid"
          actual={f.labourPayments}
          variance={labour}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm font-bold text-muted-foreground">
          Combined Budget Variance
        </span>
        <VarianceMoney amount={total} className="text-lg" />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
        <span className="text-sm text-muted-foreground">
          Accumulated Material Variance (project-wide)
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
}: {
  title: string;
  estimatedLabel: string;
  estimated: number;
  actualLabel: string;
  actual: number;
  variance: number;
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
        <span className="font-bold text-muted-foreground">Variance</span>
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
