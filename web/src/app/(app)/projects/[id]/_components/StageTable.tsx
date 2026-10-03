import type { CSSProperties } from "react";
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
import motion from "./motion.module.css";
import { OverviewPanel } from "./OverviewPanel";

/**
 * Stage | Progress | Funding | Top-up needed, once the panel is wide enough.
 * Every column but the first has a fixed width, so the header and each row
 * share the same tracks and stay aligned; the stage name keeps a floor of
 * 11rem so a long name wraps between words instead of spilling into the
 * progress bar. The row's actions sit on their own line under it.
 */
const ROW_GRID =
  "@2xl:grid-cols-[minmax(11rem,1fr)_8rem_9rem_8.5rem] @2xl:gap-x-4 @2xl:gap-y-1";

const ACTION =
  "inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-sm font-bold text-muted-foreground transition-[color,background-color,transform] duration-100 hover:text-foreground motion-safe:active:scale-[0.97] active:bg-accent/10 active:text-foreground";

/**
 * Every stage in build order, one row each: where the work is, whether its own
 * funding covers it, and how much top-up it needs. A stage's deposits can't
 * fund another stage, so the top-up is per stage and links to that stage's
 * financial check. A column table when the panel is wide; below that each row
 * becomes a small labelled card (one list either way — nothing is rendered
 * twice, so the "Work this stage" forms stay single). Each row action carries
 * the stage's name as hidden text after its visible label, so a links list or
 * a voice command can tell one row's "Edit" from the next.
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
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-card-foreground hover:underline"
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
      </div>
      <ol>
        {stages
          .slice()
          .sort((a, b) => a.seq - b.seq)
          .map((stage, i) => {
            const isCurrent = stage.id === currentStageId;
            const topUp = forecastFundingRequirement(stage.financials);
            const rowContext = <span className="sr-only">, {stage.name}</span>;
            return (
              <li
                key={stage.id}
                style={{ "--i": i } as CSSProperties}
                className={`grid grid-cols-2 gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 last:rounded-b-[11px] md:px-5 ${ROW_GRID} ${motion.stageRow} ${
                  isCurrent ? `bg-muted ${motion.currentStageRow}` : ""
                }`}
              >
                <div className="col-span-2 min-w-0 [overflow-wrap:anywhere] @2xl:col-span-1">
                  <span className="font-bold text-card-foreground">
                    {stage.seq}. {stage.name}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 inline-flex whitespace-nowrap rounded-full bg-accent px-2 py-0.5 align-[1px] text-sm font-bold text-on-accent [overflow-wrap:normal]">
                      {t("overview.stages.current")}
                    </span>
                  )}
                  <span className="block text-sm text-muted-foreground">
                    {t(STAGE_STATUS_KEYS[stage.status])}
                  </span>
                </div>

                <div className="@2xl:pt-0.5">
                  <span className="block text-sm text-muted-foreground @2xl:sr-only">
                    {columns[1]}
                  </span>
                  <div className="flex items-center gap-2 @2xl:min-h-6">
                    <ProgressBar
                      percent={stage.progressPercent}
                      className="max-w-24 flex-1"
                      label={t("overview.stages.progress", { name: stage.name })}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {stage.progressPercent}%
                    </span>
                  </div>
                </div>

                <div className="@2xl:pt-0.5">
                  <span className="block text-sm text-muted-foreground @2xl:sr-only">
                    {columns[2]}
                  </span>
                  <HealthBadge health={financialHealth(stage.financials)} size="sm" />
                </div>

                <div className="col-span-2 whitespace-nowrap @2xl:col-span-1 @2xl:pt-0.5 @2xl:text-right">
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

                <div className="col-span-2 -ml-2 flex flex-wrap items-center @2xl:col-span-4">
                  <Link href={`/projects/${projectId}/stages/${stage.id}`} className={ACTION}>
                    {t("overview.stages.tasks")}
                    {rowContext}
                  </Link>
                  <Link href={`/projects/${projectId}/stages/${stage.id}/edit`} className={ACTION}>
                    {t("overview.stages.edit")}
                    {rowContext}
                  </Link>
                  {!isCurrent && (
                    <form action={setCurrentStageAction.bind(null, projectId, stage.id)}>
                      <button type="submit" className={ACTION}>
                        {t("overview.stages.work")}
                    {rowContext}
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
