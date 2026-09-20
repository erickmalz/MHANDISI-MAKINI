import type { StageFinancials } from "@/lib/types";
import {
  availableFloat,
  totalCommitted,
  remainingStageRequirement,
  forecastFundingRequirement,
} from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";
import { PositionBar } from "./PositionBar";

/**
 * Client project funds only. One hero figure — the Available Float, the number
 * the engineer decides by — with the supporting figures quiet beside it, then
 * the single position bar. The supervision fee never appears here: it is its
 * own ledger (`SupervisorFee`).
 */
export async function FinancialPosition({ f }: { f: StageFinancials }) {
  const t = await getT();
  const shortfall = forecastFundingRequirement(f);
  const float = availableFloat(f);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-card-foreground">
          {t("overview.position.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("overview.position.subtitle")}
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{t("overview.position.float")}</p>
        <p className="mt-1">
          <Money
            amount={float}
            className="text-4xl font-bold text-card-foreground"
            negativeClassName="text-4xl font-bold text-destructive"
          />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("overview.position.floatNote")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("overview.position.deposited")} amount={f.clientDeposits} />
        <StatTile label={t("overview.position.commitments")} amount={totalCommitted(f)} />
        <StatTile label={t("overview.position.remaining")} amount={remainingStageRequirement(f)} />
        <StatTile
          label={shortfall > 0 ? t("overview.position.shortfall") : t("overview.position.surplus")}
          amount={Math.abs(shortfall)}
          tone={shortfall > 0 ? "destructive" : undefined}
        />
      </div>

      <div className="border-t border-border pt-4">
        <PositionBar f={f} />
      </div>
    </Card>
  );
}
