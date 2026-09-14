import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react/dist/ssr";

import {
  getAccumulatedMaterialVariance,
  getStageDetail,
  listVariationsForStage,
} from "@/lib/data";
import { estimatedMaterialCost, taskStatusLabel } from "@/lib/tasks";
import { stageStatusLabel } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VariationStatusBadge } from "../../variations/_components/VariationStatusBadge";
import { BudgetVarianceCard } from "./_components/BudgetVarianceCard";

export default async function StageDetailPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]">) {
  const { id, stageId } = await params;

  const stage = await getStageDetail(stageId);
  if (!stage || stage.projectId !== id) notFound();

  const [variations, accumulatedMaterialVariance] = await Promise.all([
    listVariationsForStage(stageId),
    getAccumulatedMaterialVariance(id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.projectName}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Stage {stage.seq} &middot; {stageStatusLabel(stage.status)}
          </p>
          <h1 className="text-[1.75rem] font-bold text-foreground">{stage.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/projects/${id}/stages/${stageId}/edit`}
            className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <PencilSimple size={16} aria-hidden="true" />
            Edit stage
          </Link>
          <Button
            variant="primary"
            href={`/projects/${id}/stages/${stageId}/tasks/new`}
          >
            <Plus size={20} aria-hidden="true" />
            Add task
          </Button>
        </div>
      </header>

      {stage.tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No tasks in this stage yet. Add the work items, each with its
          subcontractor, labour agreement and material take-off.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stage.tasks.map((task) => (
            <li key={task.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-card-foreground">
                        {task.seq}. {task.description}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        {taskStatusLabel(task.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.subcontractorName ?? "Unassigned"}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${id}/tasks/${task.id}/edit`}
                    className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    <PencilSimple size={16} aria-hidden="true" />
                    Edit
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <ProgressBar
                    percent={task.progressPercent}
                    className="flex-1"
                    label={`${task.description} progress`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {task.progressPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Labour agreement</p>
                    <Money
                      amount={task.labourAmount ?? 0}
                      className="font-bold text-card-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Material estimate</p>
                    <Money
                      amount={estimatedMaterialCost(task)}
                      className="font-bold text-card-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Take-off lines</p>
                    <p className="font-bold text-card-foreground">
                      {task.materialLines.length}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <BudgetVarianceCard
          f={stage.financials}
          accumulatedMaterialVariance={accumulatedMaterialVariance}
        />
      </div>

      <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Variations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Formally logged scope changes against this stage&rsquo;s tasks.
          </p>
        </div>
        {stage.tasks.length > 0 && (
          <Button
            variant="secondary"
            href={`/projects/${id}/stages/${stageId}/variations/new`}
          >
            <Plus size={20} aria-hidden="true" />
            Raise variation
          </Button>
        )}
      </div>

      {variations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          No variations logged against this stage yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {variations.map((v) => (
            <li key={v.id}>
              <Link
                href={`/projects/${id}/variations/${v.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-card-foreground">
                      {v.displayNumber ?? "Draft"}
                    </span>
                    <VariationStatusBadge status={v.status} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {v.taskDescription} — {v.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 text-sm sm:text-right">
                  {v.materialImpact != null && v.materialImpact !== 0 && (
                    <span className="text-muted-foreground">
                      Material <Money amount={v.materialImpact} className="font-bold text-card-foreground" />
                    </span>
                  )}
                  {v.labourImpact != null && v.labourImpact !== 0 && (
                    <span className="text-muted-foreground">
                      Labour <Money amount={v.labourImpact} className="font-bold text-card-foreground" />
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
