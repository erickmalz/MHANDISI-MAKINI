import type { StageFinancials } from "@/lib/types";
import {
  availableFloat,
  totalCommitted,
  remainingStageRequirement,
  forecastFundingRequirement,
} from "@/lib/finance";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";

export function FinancialPosition({ f }: { f: StageFinancials }) {
  const shortfall = forecastFundingRequirement(f);

  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">
        Project financial position
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
        <StatTile label="Client deposited" amount={f.clientDeposits} emphasis />
        <StatTile label="Project commitments" amount={totalCommitted(f)} />
        <StatTile label="Supervisor fee invoiced" amount={f.feeInvoiced} />
        <StatTile label="Available Float" amount={availableFloat(f)} emphasis />
        <StatTile label="Remaining expected" amount={remainingStageRequirement(f)} />
        <StatTile
          label={shortfall > 0 ? "Funding shortfall" : "Funding surplus"}
          amount={Math.abs(shortfall)}
          tone={shortfall > 0 ? "destructive" : undefined}
        />
      </div>
    </Card>
  );
}
