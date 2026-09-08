import type { Stage } from "@/lib/types";
import { financialHealth } from "@/lib/finance";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function StageList({
  stages,
  currentStageId,
}: {
  stages: Stage[];
  currentStageId: string | null;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">Stages</h2>
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
                  isCurrent
                    ? "border-border-strong bg-muted"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-card-foreground">
                      {stage.seq}. {stage.name}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {stage.status}
                      {isCurrent && " · current stage"}
                    </span>
                  </div>
                  <HealthBadge health={financialHealth(stage.financials)} size="sm" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar
                    percent={stage.progressPercent}
                    className="flex-1"
                    label={`${stage.name} progress`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {stage.progressPercent}%
                  </span>
                </div>
              </li>
            );
          })}
      </ul>
    </Card>
  );
}
