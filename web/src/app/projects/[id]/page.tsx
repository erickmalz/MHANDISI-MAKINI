import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Plus,
  ShoppingCartSimple,
} from "@phosphor-icons/react/dist/ssr";
import { getProject, getCurrentStage } from "@/lib/mock-data";
import { financialHealth } from "@/lib/finance";
import { Button } from "@/components/ui/Button";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { FinancialPosition } from "./_components/FinancialPosition";
import { StageList } from "./_components/StageList";
import { AlertsList } from "./_components/AlertsList";
import { Breakdown } from "./_components/Breakdown";

export default async function ProjectOverviewPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const stage = getCurrentStage(project);
  const health = financialHealth(stage.financials);

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
          <HealthBadge health={health} />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="secondary"
              href={`/projects/${project.id}/procurement`}
            >
              <ShoppingCartSimple size={20} aria-hidden="true" />
              Purchase orders
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

      <div className="mb-6">
        <FinancialPosition f={stage.financials} />
      </div>

      <div className="mb-6">
        <Breakdown f={stage.financials} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StageList stages={project.stages} currentStageId={project.currentStageId} />
        <AlertsList alerts={project.alerts} />
      </div>
    </main>
  );
}
