import { notFound } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getProjectOverview } from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { getCurrentStage } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { FinancialPosition } from "./_components/FinancialPosition";
import { StageList } from "./_components/StageList";
import { AlertsList } from "./_components/AlertsList";
import { Breakdown } from "./_components/Breakdown";
import { StatusBand } from "./_components/StatusBand";
import { SupervisorFee } from "./_components/SupervisorFee";

export const generateMetadata = pageTitle("overview.pageTitle");

/**
 * The project's home. Who the project is and where to go next (the tabs) lives
 * in the project layout; this page opens with the current situation and the
 * one thing to do next.
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
      <PageHeader
        title={t("overview.title")}
        actions={
          <Button variant="primary" href={`/projects/${project.id}/funding/new`}>
            <Plus size={20} aria-hidden="true" />
            {t("overview.createFundingRequest")}
          </Button>
        }
      />

      {stage ? (
        <div className="flex flex-col gap-6">
          <StatusBand financials={stage.financials} alerts={project.alerts} />

          <FinancialPosition f={stage.financials} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StageList
              projectId={project.id}
              stages={project.stages}
              currentStageId={project.currentStageId}
            />
            <AlertsList alerts={project.alerts} />
          </div>

          <Breakdown f={stage.financials} />

          <SupervisorFee f={stage.financials} />
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
