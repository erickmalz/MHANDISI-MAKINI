import { Plus } from "@phosphor-icons/react/dist/ssr";

import { setCurrentStageAction } from "@/app/actions/stages";
import type { Stage } from "@/lib/types";
import { financialHealth } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { STAGE_STATUS_KEYS } from "../../_components/status-keys";

export async function StageList({
  projectId,
  stages,
  currentStageId,
}: {
  projectId: string;
  stages: Stage[];
  currentStageId: string | null;
}) {
  const t = await getT();
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-card-foreground">{t("overview.stages.title")}</h2>
        <Button variant="ghost" href={`/projects/${projectId}/stages/new`}>
          <Plus size={16} aria-hidden="true" />
          {t("overview.stages.add")}
        </Button>
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {stages
          .slice()
          .sort((a, b) => a.seq - b.seq)
          .map((stage) => {
            const isCurrent = stage.id === currentStageId;
            return (
              <li
                key={stage.id}
                className={`rounded-lg border p-4 ${
                  isCurrent ? "border-border-strong bg-muted" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-card-foreground">
                      {stage.seq}. {stage.name}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {t(STAGE_STATUS_KEYS[stage.status])}
                      {isCurrent && ` · ${t("overview.stages.current")}`}
                    </span>
                  </div>
                  <HealthBadge health={financialHealth(stage.financials)} size="sm" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar
                    percent={stage.progressPercent}
                    className="flex-1"
                    label={t("overview.stages.progress", { name: stage.name })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {stage.progressPercent}%
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" href={`/projects/${projectId}/stages/${stage.id}`}>
                    {t("overview.stages.tasks")}
                  </Button>
                  <Button variant="ghost" href={`/projects/${projectId}/stages/${stage.id}/edit`}>
                    {t("overview.stages.edit")}
                  </Button>
                  {!isCurrent && (
                    <form action={setCurrentStageAction.bind(null, projectId, stage.id)}>
                      <button
                        type="submit"
                        className="inline-flex min-h-12 cursor-pointer items-center px-2 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                      >
                        {t("overview.stages.work")}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </Card>
  );
}
