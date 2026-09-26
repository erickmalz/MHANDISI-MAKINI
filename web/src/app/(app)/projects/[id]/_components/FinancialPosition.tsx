import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Stage } from "@/lib/types";
import { aggregateStageFinancials, forecastFundingRequirement } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";

/**
 * Client project funds only, summed across every stage of the project (via
 * `aggregateStageFinancials` — the same roll-up the Financial Summary report
 * uses, guidelines §51's "one authoritative calculation path"). The totals
 * are a quiet reference strip, not a hero number: a stage's deposits can't
 * fund another stage's costs, so a project-wide float or shortfall isn't a
 * decision figure on its own (see `forecastShortfall`'s doc comment in
 * `finance.ts`). The card's weight goes instead to naming exactly which
 * stage(s) are short and linking straight to each one. The supervision fee
 * never appears here: it is its own ledger (`SupervisorFee`).
 */
export async function FinancialPosition({
  projectId,
  stages,
}: {
  projectId: string;
  stages: Stage[];
}) {
  const t = await getT();
  const totals = aggregateStageFinancials(stages.map((s) => s.financials));

  const shortStages = stages
    .map((s) => ({ stage: s, gap: forecastFundingRequirement(s.financials) }))
    .filter(({ gap }) => gap > 0)
    .sort((a, b) => b.gap - a.gap);

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

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-muted p-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">{t("overview.position.float")}</dt>
          <dd className="mt-0.5">
            <Money
              amount={totals.availableFloat}
              className="font-bold text-card-foreground"
              negativeClassName="font-bold text-destructive"
            />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("overview.position.deposited")}</dt>
          <dd className="mt-0.5">
            <Money amount={totals.clientDeposits} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("overview.position.commitments")}</dt>
          <dd className="mt-0.5">
            <Money amount={totals.commitments} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("overview.position.remaining")}</dt>
          <dd className="mt-0.5">
            <Money
              amount={totals.remainingStageRequirement}
              className="font-bold text-card-foreground"
            />
          </dd>
        </div>
      </dl>

      {shortStages.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-health-green bg-health-green-bg p-4">
          <CheckCircle
            size={22}
            weight="fill"
            className="shrink-0 text-health-green"
            aria-hidden="true"
          />
          <p className="text-sm font-bold text-card-foreground">
            {t("overview.position.allFunded")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border-l-4 border-accent bg-accent/10 p-4">
          <div className="flex items-center gap-2">
            <WarningCircle
              size={22}
              weight="fill"
              className="shrink-0 text-[var(--mm-yellow-pressed)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-bold text-card-foreground">
              {t("overview.position.needsTopUp", { count: shortStages.length })}
            </h3>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {shortStages.map(({ stage, gap }) => (
              <li
                key={stage.id}
                className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2"
              >
                <span className="truncate text-sm font-bold text-card-foreground">
                  {stage.name}
                </span>
                <div className="flex items-center gap-4">
                  <Money amount={gap} className="font-bold text-destructive" />
                  <Link
                    href={`/projects/${projectId}/stages/${stage.id}/financial-check`}
                    className="text-sm font-bold text-accent underline underline-offset-2"
                  >
                    {t("overview.position.viewStage")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
