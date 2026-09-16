import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { archiveProjectAction, completeProjectAction } from "@/app/actions/project-closeout";
import { getProjectCloseoutGates, getProjectInput, getProjectOverview } from "@/lib/data";
import {
  canArchiveProject,
  canCompleteProject,
  projectCloseoutBlockers,
} from "@/lib/project-closeout";
import { stageStatusLabel } from "@/lib/project-view";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";

const COMPLETE_ERROR_MESSAGES: Record<string, string> = {
  "not-found": "This project could not be found.",
  "not-completable-status":
    "This project is not Active or On Hold, so Complete Project is unavailable.",
  "gates-failed":
    "This project still has open stages blocking completion — check the checklist below.",
};

const ARCHIVE_ERROR_MESSAGES: Record<string, string> = {
  "not-found": "This project could not be found.",
  "not-archivable-status": "Only a Completed project can be archived.",
};

export default async function ProjectCloseoutPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/closeout">) {
  const { id } = await params;
  const { completeError, archiveError } = await searchParams;

  const [projectInput, project, gates] = await Promise.all([
    getProjectInput(id),
    getProjectOverview(id),
    getProjectCloseoutGates(id),
  ]);
  if (!projectInput || !project || !gates) notFound();

  const status = projectInput.status;
  const isCompleted = status === "completed" || status === "archived";
  const isArchived = status === "archived";
  const blockers = projectCloseoutBlockers(gates);
  const canComplete = canCompleteProject(status, gates);
  const canArchive = canArchiveProject(status);

  const completeErrorMessage =
    typeof completeError === "string" ? COMPLETE_ERROR_MESSAGES[completeError] : undefined;
  const archiveErrorMessage =
    typeof archiveError === "string" ? ARCHIVE_ERROR_MESSAGES[archiveError] : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6">
        <p className="text-sm text-muted-foreground">
          {project.code} &middot; {project.clientName}
        </p>
        <h1 className="text-[1.75rem] font-bold text-foreground">
          Project Closeout — {project.name}
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          A controlled review before this project is marked Completed —
          distinct from simply picking &ldquo;Completed&rdquo; on the project
          form. Every stage must already be closed before{" "}
          <span className="font-bold text-foreground">Complete Project</span>{" "}
          is available. Completing freezes a full financial reconciliation
          report; Archive becomes available afterwards.
        </p>
      </header>

      {completeErrorMessage && (
        <Card className="mb-6 border-health-red bg-health-red-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-red">
            <WarningCircle size={18} aria-hidden="true" />
            {completeErrorMessage}
          </p>
        </Card>
      )}
      {archiveErrorMessage && (
        <Card className="mb-6 border-health-red bg-health-red-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-red">
            <WarningCircle size={18} aria-hidden="true" />
            {archiveErrorMessage}
          </p>
        </Card>
      )}

      {isArchived && (
        <Card className="mb-6 border-health-green bg-health-green-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-green">
            <CheckCircle size={18} aria-hidden="true" />
            Archived. Hidden from the default Choose Project list — there is
            no un-archive flow.
          </p>
        </Card>
      )}
      {isCompleted && !isArchived && (
        <Card className="mb-6 border-health-green bg-health-green-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-green">
            <CheckCircle size={18} aria-hidden="true" />
            Completed. Its closeout report is frozen below.
          </p>
        </Card>
      )}

      {!isCompleted && (
        <Card className="mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-card-foreground">
            Closeout checks
          </h2>
          <ul className="flex flex-col gap-3">
            <ChecklistItem ok={blockers.length === 0} label="Every stage is closed">
              {!gates.hasStages && (
                <p className="text-sm text-muted-foreground">
                  This project has no stages yet.
                </p>
              )}
              {gates.openStages.length > 0 && (
                <StageList items={gates.openStages} projectId={id} />
              )}
            </ChecklistItem>
          </ul>

          <form
            action={completeProjectAction.bind(null, id)}
            className="border-t border-border pt-4"
          >
            <Button variant="primary" type="submit" disabled={!canComplete}>
              Complete Project
            </Button>
            {!canComplete && blockers.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Resolve every item above to enable Complete Project.
              </p>
            )}
          </form>
        </Card>
      )}

      {!isCompleted && (
        <Card className="mb-6 flex items-start gap-2 border-border">
          <Info size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Supplier and Subcontractor balances stay live, current-state
            screens exactly as already built — Complete does not trigger a
            new Statement. The frozen report captures Supplier/Subcontractor
            balances and any outstanding documents as of the moment you
            complete.
          </p>
        </Card>
      )}

      {isCompleted && (
        <div className="flex flex-col gap-6">
          <DocumentDownloads
            links={[
              {
                label: `Project closeout report — ${project.name}`,
                pdfHref: `/projects/${id}/closeout/document.pdf`,
                jpgHref: `/projects/${id}/closeout/document.jpg`,
              },
            ]}
          />

          {!isArchived && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-card-foreground">
                Archive
              </h2>
              <p className="text-sm text-muted-foreground">
                Hides this project from the default Choose Project list. The
                closeout report already captured the final numbers, so
                Archive writes no new report. There is no un-archive flow.
              </p>
              <form action={archiveProjectAction.bind(null, id)}>
                <Button variant="secondary" type="submit" disabled={!canArchive}>
                  <Archive size={20} aria-hidden="true" />
                  Archive Project
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}

function ChecklistItem({
  ok,
  label,
  children,
}: {
  ok: boolean;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      {ok ? (
        <CheckCircle size={20} className="mt-0.5 shrink-0 text-health-green" aria-hidden="true" />
      ) : (
        <WarningCircle size={20} className="mt-0.5 shrink-0 text-health-red" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className={`font-bold ${ok ? "text-card-foreground" : "text-health-red"}`}>{label}</p>
        {!ok && children}
      </div>
    </li>
  );
}

function StageList({
  items,
  projectId,
}: {
  items: { id: string; seq: number; name: string; status: string }[];
  projectId: string;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((s) => (
        <li key={s.id}>
          <Link
            href={`/projects/${projectId}/stages/${s.id}/closeout`}
            className="underline"
          >
            {s.seq}. {s.name} — {stageStatusLabel(s.status)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
