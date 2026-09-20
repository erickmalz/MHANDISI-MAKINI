import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";

import { setCurrentStageAction } from "@/app/actions/stages";
import type { Stage } from "@/lib/types";
import { financialHealth } from "@/lib/finance";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function StageList({
  projectId,
  stages,
  currentStageId,
}: {
  projectId: string;
  stages: Stage[];
  currentStageId: string | null;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-card-foreground">Stages</h2>
        <Link
          href={`/projects/${projectId}/stages/new`}
          className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <Plus size={16} aria-hidden="true" />
          Add stage
        </Link>
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
                <div className="mt-3 flex items-center gap-4">
                  <Link
                    href={`/projects/${projectId}/stages/${stage.id}`}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    Tasks
                  </Link>
                  <Link
                    href={`/projects/${projectId}/stages/${stage.id}/edit`}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </Link>
                  {!isCurrent && (
                    <form action={setCurrentStageAction.bind(null, projectId, stage.id)}>
                      <button
                        type="submit"
                        className="cursor-pointer text-sm font-bold text-muted-foreground hover:text-foreground rounded-md transition-[color,background-color,transform] duration-100 active:scale-[0.97] active:bg-accent/10 active:text-foreground"
                      >
                        Work this stage
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
