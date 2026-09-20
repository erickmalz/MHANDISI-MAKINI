import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { emphasise, stageStatusText } from "./_components/closeout-text";

export const generateMetadata = pageTitle("closeout.project.pageTitle");

// The URL carries a short error code; each maps to a catalogue message.
const COMPLETE_ERROR_KEYS = {
  "not-found": "closeout.project.errors.notFound",
  "not-completable-status": "closeout.project.errors.notCompletable",
  "gates-failed": "closeout.project.errors.gatesFailed",
} as const;

const ARCHIVE_ERROR_KEYS = {
  "not-found": "closeout.project.errors.notFound",
  "not-archivable-status": "closeout.project.errors.notArchivable",
} as const;

export default async function ProjectCloseoutPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/closeout">) {
  const { id } = await params;
  const { completeError, archiveError } = await searchParams;

  const [projectInput, project, gates, t] = await Promise.all([
    getProjectInput(id),
    getProjectOverview(id),
    getProjectCloseoutGates(id),
    getT(),
  ]);
  if (!projectInput || !project || !gates) notFound();

  const status = projectInput.status;
  const isCompleted = status === "completed" || status === "archived";
  const isArchived = status === "archived";
  const blockers = projectCloseoutBlockers(gates);
  const canComplete = canCompleteProject(status, gates);
  const canArchive = canArchiveProject(status);

  const completeErrorMessage =
    typeof completeError === "string" && completeError in COMPLETE_ERROR_KEYS
      ? t(COMPLETE_ERROR_KEYS[completeError as keyof typeof COMPLETE_ERROR_KEYS])
      : undefined;
  const archiveErrorMessage =
    typeof archiveError === "string" && archiveError in ARCHIVE_ERROR_KEYS
      ? t(ARCHIVE_ERROR_KEYS[archiveError as keyof typeof ARCHIVE_ERROR_KEYS])
      : undefined;
  const completeLabel = t("closeout.project.complete");

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("closeout.crumbOverview"), href: `/projects/${id}` }]}
        title={t("closeout.project.pageTitle")}
        subtitle={emphasise(t("closeout.project.subtitle", { action: completeLabel }), completeLabel)}
      />

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
            {t("closeout.project.archivedNotice")}
          </p>
        </Card>
      )}
      {isCompleted && !isArchived && (
        <Card className="mb-6 border-health-green bg-health-green-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-green">
            <CheckCircle size={18} aria-hidden="true" />
            {t("closeout.project.completedNotice")}
          </p>
        </Card>
      )}

      {!isCompleted && (
        <Card className="mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-card-foreground">
            {t("closeout.project.checksTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            <ChecklistItem ok={blockers.length === 0} label={t("closeout.project.everyStageClosed")}>
              {!gates.hasStages && (
                <p className="text-sm text-muted-foreground">
                  {t("closeout.project.noStages")}
                </p>
              )}
              {gates.openStages.length > 0 && (
                <StageList items={gates.openStages} projectId={id} t={t} />
              )}
            </ChecklistItem>
          </ul>

          <form
            action={completeProjectAction.bind(null, id)}
            className="border-t border-border pt-4"
          >
            <Button variant="primary" type="submit" disabled={!canComplete}>
              {completeLabel}
            </Button>
            {!canComplete && blockers.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("closeout.project.resolveAll")}
              </p>
            )}
          </form>
        </Card>
      )}

      {!isCompleted && (
        <Card className="mb-6 flex items-start gap-2 border-border">
          <Info size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            {t("closeout.project.statementsNote")}
          </p>
        </Card>
      )}

      {isCompleted && (
        <div className="flex flex-col gap-6">
          <DocumentDownloads
            links={[
              {
                label: t("closeout.project.reportLabel", { name: project.name }),
                pdfHref: `/projects/${id}/closeout/document.pdf`,
                jpgHref: `/projects/${id}/closeout/document.jpg`,
              },
            ]}
          />

          {!isArchived && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-card-foreground">
                {t("closeout.project.archiveTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("closeout.project.archiveBody")}
              </p>
              <form action={archiveProjectAction.bind(null, id)}>
                <Button variant="secondary" type="submit" disabled={!canArchive}>
                  <Archive size={20} aria-hidden="true" />
                  {t("closeout.project.archiveButton")}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </PageFrame>
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
  t,
}: {
  items: { id: string; seq: number; name: string; status: string }[];
  projectId: string;
  t: Translator;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((s) => (
        <li key={s.id}>
          <Link
            href={`/projects/${projectId}/stages/${s.id}/closeout`}
            className="underline"
          >
            {t("closeout.project.stageLink", {
              seq: s.seq,
              name: s.name,
              status: stageStatusText(t, s.status),
            })}
          </Link>
        </li>
      ))}
    </ul>
  );
}
