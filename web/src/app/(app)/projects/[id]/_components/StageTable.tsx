import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";

import { setCurrentStageAction } from "@/app/actions/stages";
import type { Stage } from "@/lib/types";
import { financialHealth, forecastFundingRequirement, formatTZS } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { Money } from "@/components/ui/Money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { STAGE_STATUS_KEYS } from "../../_components/status-keys";
import { OverviewPanel } from "./OverviewPanel";

/** Stage | Progress | Funding | Top-up needed | actions, once the panel is wide enough. */
const ROW_GRID =
  "@2xl:grid-cols-[minmax(0,1fr)_9rem_8.5rem_8.5rem_auto] @2xl:items-center @2xl:gap-x-4";

const ACTION =
  "inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-sm font-bold text-muted-foreground transition-[color,background-color,transform] duration-100 hover:text-foreground active:scale-[0.97] active:bg-accent/10 active:text-foreground";

/**
 * Every stage in build order, one row each: where the work is, whether its own
 * funding covers it, and how much top-up it needs. A stage's deposits can't
 * fund another stage, so the top-up is per stage and links to that stage's
 * financial check. A column table when the panel is wide; below that each row
 * becomes a small labelled card (one list either way — nothing is rendered
 * twice, so the "Work this stage" forms stay single).
 */
export async function StageTable({
  projectId,
  stages,
  currentStageId,
}: {
  projectId: string;
  stages: Stage[];
  currentStageId: string | null;
}) {
  const t = await getT();
  const columns = [
    t("overview.stages.columns.stage"),
    t("overview.stages.columns.progress"),
    t("overview.stages.columns.funding"),
    t("overview.stages.columns.topUp"),
  ];

  return (
    <OverviewPanel
      headingId="overview-stages"
      title={t("overview.stages.title")}
      aside={
        <Link
          href={`/projects/${projectId}/stages/new`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-on-accent hover:underline"
        >
          <Plus size={16} aria-hidden="true" />
          {t("overview.stages.add")}
        </Link>
      }
    >
      <div
        aria-hidden="true"
        className={`hidden border-b border-border px-5 py-2.5 text-sm font-bold text-muted-foreground @2xl:grid ${ROW_GRID}`}
      >
        <span>{columns[0]}</span>
        <span>{columns[1]}</span>
        <span>{columns[2]}</span>
        <span className="text-right">{columns[3]}</span>
        <span />
      </div>
      <ol>
        {stages
          .slice()
          .sort((a, b) => a.seq - b.seq)
          .map((stage) => {
            const isCurrent = stage.id === currentStageId;
            const topUp = forecastFundingRequirement(stage.financials);
            return (
              <li
                key={stage.id}
                className={`grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 last:rounded-b-[10px] md:px-5 ${ROW_GRID} ${
                  isCurrent ? "bg-muted" : ""
                }`}
              >
                <div className="col-span-2 @2xl:col-span-1">
                  <span className="font-bold text-card-foreground">
                    {stage.seq}. {stage.name}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 inline-flex rounded-full bg-accent px-2 py-0.5 align-[1px] text-sm font-bold text-on-accent">
                      {t("overview.stages.current")}
                    </span>
                  )}
                  <span className="block text-sm text-muted-foreground">
                    {t(STAGE_STATUS_KEYS[stage.status])}
                  </span>
                </div>

                <div>
                  <span className="block text-sm text-muted-foreground @2xl:sr-only">
                    {columns[1]}
                  </span>
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      percent={stage.progressPercent}
                      className="max-w-24 flex-1"
                      label={t("overview.stages.progress", { name: stage.name })}
                    />
                    <span className="text-sm text-muted-foreground">{stage.progressPercent}%</span>
                  </div>
                </div>

                <div>
                  <span className="block text-sm text-muted-foreground @2xl:sr-only">
                    {columns[2]}
                  </span>
                  <HealthBadge health={financialHealth(stage.financials)} size="sm" />
                </div>

                <div className="col-span-2 @2xl:col-span-1 @2xl:text-right">
                  <span className="text-sm text-muted-foreground @2xl:sr-only">{columns[3]} </span>
                  {topUp > 0 ? (
                    <Link
                      href={`/projects/${projectId}/stages/${stage.id}/financial-check`}
                      aria-label={t("overview.stages.topUpLink", {
                        name: stage.name,
                        amount: formatTZS(topUp),
                      })}
                      className="font-bold text-card-foreground underline underline-offset-2"
                    >
                      <Money amount={topUp} />
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("overview.stages.topUpNone")}
                    </span>
                  )}
                </div>

                <div className="col-span-2 -ml-2 flex flex-wrap items-center @2xl:col-span-1 @2xl:ml-0 @2xl:justify-end">
                  <Link href={`/projects/${projectId}/stages/${stage.id}`} className={ACTION}>
                    {t("overview.stages.tasks")}
                  </Link>
                  <Link href={`/projects/${projectId}/stages/${stage.id}/edit`} className={ACTION}>
                    {t("overview.stages.edit")}
                  </Link>
                  {!isCurrent && (
                    <form action={setCurrentStageAction.bind(null, projectId, stage.id)}>
                      <button type="submit" className={ACTION}>
                        {t("overview.stages.work")}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
      </ol>
    </OverviewPanel>
  );
}
