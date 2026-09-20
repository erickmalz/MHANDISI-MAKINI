import Link from "next/link";

import { financialHealth } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import type { ProjectAlert, StageFinancials } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { SEVERITY_CONFIG } from "./AlertsList";
import { pickTopAlert, statusSentence } from "./overview";

/**
 * The first thing on the Overview: the situation in one sentence, and the one
 * thing to look at next. The badge and sentence come from the stage's
 * financials; the next action is the most urgent unresolved alert (with its
 * link to the record), or a plain "no alerts" line.
 */
export async function StatusBand({
  financials,
  alerts,
}: {
  financials: StageFinancials;
  alerts: ProjectAlert[];
}) {
  const t = await getT();
  const health = financialHealth(financials);
  const top = pickTopAlert(alerts);
  const others = alerts.length - 1;

  return (
    <Card aria-label={t("overview.status.label")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <HealthBadge health={health} />
        <p className="min-w-64 flex-1 font-bold text-card-foreground">
          {statusSentence(financials, health, t)}
        </p>
      </div>

      <div className="border-t border-border pt-3">
        {top ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <NextAction alert={top} t={t} />
            {others > 0 && (
              <Link
                href="#alerts"
                className="inline-flex min-h-12 items-center px-1 text-sm font-bold text-muted-foreground underline hover:text-foreground"
              >
                {t("overview.status.moreAlerts", { count: others })}
              </Link>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">{t("overview.status.noAlerts")}</p>
        )}
      </div>
    </Card>
  );
}

function NextAction({ alert, t }: { alert: ProjectAlert; t: Translator }) {
  const { Icon, labelKey, className } = SEVERITY_CONFIG[alert.severity];
  return (
    <>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-sm font-bold ${className}`}
      >
        <Icon size={16} aria-hidden="true" />
        {t(labelKey)}
      </span>
      <span className="min-w-0 text-card-foreground">{alert.message}</span>
      {alert.href && (
        <Link
          href={alert.href}
          className="inline-flex min-h-12 items-center px-1 font-bold text-foreground underline"
        >
          {t("overview.status.view")}
        </Link>
      )}
    </>
  );
}
