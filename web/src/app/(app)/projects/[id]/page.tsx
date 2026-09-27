import { notFound } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getProjectOverview } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { getCurrentStage } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breakdown } from "./_components/Breakdown";
import { FinancialPosition } from "./_components/FinancialPosition";
import { StageTable } from "./_components/StageTable";
import { StatusCard } from "./_components/StatusCard";
import { SupervisorFee } from "./_components/SupervisorFee";
import { ToDoList } from "./_components/ToDoList";

export const generateMetadata = pageTitle("overview.pageTitle");

/**
 * The project's home. Who the project is and where to go next (the tabs) lives
 * in the project layout; this page is the working desk: what needs doing, the
 * stages and the current stage's costs down the main column, and beside them
 * the situation in one sentence (with the page's one primary action), the
 * project-wide totals and the separate supervisor-fee ledger.
 *
 * Below `xl` it is one column, opening with the status card.
 */
export default async function ProjectOverviewPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const t = await getT();
  const stage = getCurrentStage(project);

  return (
    <PageFrame width="working">
      <PageHeader title={t("overview.title")} />

      {stage ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:items-start">
          <StatusCard
            projectId={project.id}
            stage={stage}
            className="xl:col-start-2 xl:row-start-1"
          />

          <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-span-2 xl:row-start-1">
            <ToDoList alerts={project.alerts} />
            <StageTable
              projectId={project.id}
              stages={project.stages}
              currentStageId={project.currentStageId}
            />
            <Breakdown stage={stage} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start xl:col-start-2 xl:row-start-2 xl:grid-cols-1">
            <FinancialPosition stages={project.stages} />
            <SupervisorFee projectId={project.id} f={stage.financials} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-8 text-center">
          <h2 className="text-lg font-bold text-card-foreground">
            {t("overview.empty.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            {t("overview.empty.body")}
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" href={`/projects/${project.id}/stages/new`}>
              <Plus size={20} aria-hidden="true" />
              {t("overview.empty.action")}
            </Button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
