import type { Stage } from "@/lib/types";
import { aggregateStageFinancials } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";

/**
 * Client project funds only, summed across every stage of the project (via
 * `aggregateStageFinancials` — the same roll-up the Financial Summary report
 * uses, guidelines §51's "one authoritative calculation path"). A quiet
 * reference card, not a hero number: a stage's deposits can't fund another
 * stage's costs, so a project-wide float or shortfall isn't a decision figure
 * on its own (see `forecastShortfall`'s doc comment in `finance.ts`). The
 * figure to act on is each stage's top-up, in the Stages table. The
 * supervision fee never appears here: it is its own ledger (`SupervisorFee`).
 */
export async function FinancialPosition({ stages }: { stages: Stage[] }) {
  const t = await getT();
  const totals = aggregateStageFinancials(stages.map((s) => s.financials));

  const lines = [
    { key: "deposited", label: t("overview.position.deposited"), amount: totals.clientDeposits },
    { key: "commitments", label: t("overview.position.commitments"), amount: totals.commitments },
    { key: "float", label: t("overview.position.float"), amount: totals.availableFloat },
    { key: "remaining", label: t("overview.position.remaining"), amount: totals.remainingStageRequirement },
  ];

  return (
    <Card aria-labelledby="overview-position">
      <h2 id="overview-position" className="text-lg text-card-foreground">
        {t("overview.position.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("overview.position.subtitle")}</p>
      <dl className="mt-3 text-sm">
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex justify-between gap-3 border-b border-border py-2 last:border-b-0"
          >
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd>
              <Money amount={line.amount} className="font-bold text-card-foreground" />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
