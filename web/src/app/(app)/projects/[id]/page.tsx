import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  ShoppingCartSimple,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { getProjectOverview } from "@/lib/data";
import { financialHealth } from "@/lib/finance";
import { getCurrentStage } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { FinancialPosition } from "./_components/FinancialPosition";
import { StageList } from "./_components/StageList";
import { AlertsList } from "./_components/AlertsList";
import { Breakdown } from "./_components/Breakdown";
import { SupervisorFee } from "./_components/SupervisorFee";

export default async function ProjectOverviewPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const stage = getCurrentStage(project);
  const health = stage ? financialHealth(stage.financials) : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Choose another project
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{project.code}</p>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            {project.name}
          </h1>
          <p className="mt-1 text-muted-foreground">{project.clientName}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin size={16} aria-hidden="true" />
            {project.site}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {health && <HealthBadge health={health} />}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href={`/projects/${project.id}/edit`}
              className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <PencilSimple size={16} aria-hidden="true" />
              Edit project
            </Link>
            <Link
              href={`/projects/${project.id}/save-as-template`}
              className="inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <Stack size={16} aria-hidden="true" />
              Save as template
            </Link>
            <Button
              variant="secondary"
              href={`/projects/${project.id}/material-stock`}
            >
              <Package size={20} aria-hidden="true" />
              Material stock
            </Button>
            <Button
              variant="secondary"
              href={`/projects/${project.id}/procurement`}
            >
              <ShoppingCartSimple size={20} aria-hidden="true" />
              Purchase orders
            </Button>
            <Button
              variant="secondary"
              href={`/projects/${project.id}/funding`}
            >
              <Receipt size={20} aria-hidden="true" />
              Funding requests
            </Button>
            <Button
              variant="primary"
              href={`/projects/${project.id}/funding/new`}
            >
              <Plus size={20} aria-hidden="true" />
              Create funding request
            </Button>
          </div>
        </div>
      </header>

      {stage ? (
        <>
          <div className="mb-6">
            <FinancialPosition f={stage.financials} />
          </div>

          <div className="mb-6">
            <Breakdown f={stage.financials} />
          </div>

          <div className="mb-6">
            <SupervisorFee f={stage.financials} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StageList
              projectId={project.id}
              stages={project.stages}
              currentStageId={project.currentStageId}
            />
            <AlertsList alerts={project.alerts} />
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-8 text-center">
          <h2 className="text-lg font-bold text-card-foreground">
            No stages yet
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
            This project has no stages, so there are no figures to show yet. Add
            the first stage to start tracking its funding and costs.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" href={`/projects/${project.id}/stages/new`}>
              <Plus size={20} aria-hidden="true" />
              Add the first stage
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
