import { Plus } from "@phosphor-icons/react/dist/ssr";

import { availableFloat, financialHealth, remainingStageRequirement } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import type { Stage } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { Money } from "@/components/ui/Money";
import { statusSentence } from "./overview";

/**
 * The situation in one sentence, for the current stage: its health, the
 * sentence the numbers support, the two figures behind it, and the page's one
 * primary action. Charcoal so it reads as the page's anchor beside the lists.
 *
 * In the dark theme the charcoal sits within a shade of the page and the cards,
 * so it takes a strong-border rim there. The rim is transparent in light, where
 * the charcoal already stands apart. Both dark paths are covered: the explicit
 * `data-theme="dark"` (`dark:`) and the OS preference when no theme is chosen.
 */
export const DARK_RIM =
  "border border-transparent dark:border-border-strong [@media(prefers-color-scheme:dark)]:[:root:not([data-theme=light])_&]:border-border-strong";

export async function StatusCard({
  projectId,
  stage,
  className = "",
}: {
  projectId: string;
  stage: Stage;
  className?: string;
}) {
  const t = await getT();
  const f = stage.financials;
  const health = financialHealth(f);

  return (
    <section
      aria-labelledby="overview-status"
      className={`flex flex-col gap-4 rounded-2xl bg-surface-inverse p-6 text-on-inverse ${DARK_RIM} ${className}`.trim()}
    >
      <h2 id="overview-status" className="sr-only">
        {t("overview.status.label")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HealthBadge health={health} />
        <span className="text-sm text-on-inverse/75">{stage.name}</span>
      </div>
      <p className="font-heading text-xl font-bold">{statusSentence(f, health, t)}</p>
      <dl className="grid grid-cols-2 gap-3 border-t border-on-inverse/20 pt-4">
        <div>
          <dt className="text-sm text-on-inverse/75">{t("overview.breakdown.forecast.float")}</dt>
          <dd className="mt-0.5">
            <Money amount={availableFloat(f)} className="font-bold" negativeClassName="font-bold" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-on-inverse/75">
            {t("overview.breakdown.forecast.remainingCost")}
          </dt>
          <dd className="mt-0.5">
            <Money amount={remainingStageRequirement(f)} className="font-bold" />
          </dd>
        </div>
      </dl>
      <Button variant="primary" href={`/projects/${projectId}/funding/new`} className="w-full">
        <Plus size={20} aria-hidden="true" />
        {t("overview.createFundingRequest")}
      </Button>
    </section>
  );
}
