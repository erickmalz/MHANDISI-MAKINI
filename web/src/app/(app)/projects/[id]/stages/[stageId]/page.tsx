import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, PencilSimple, Plus } from "@phosphor-icons/react/dist/ssr";

import {
  getAccumulatedMaterialVariance,
  getStageDetail,
  listPhotos,
  listSiteDiaryEntries,
  listVariationsForStage,
} from "@/lib/data";
import { getT, pageTitle } from "@/lib/i18n/server";
import { estimatedMaterialCost } from "@/lib/tasks";
import { deletePhotoAction, uploadStagePhotoAction } from "@/app/actions/photos";
import { recordLabourPaymentAction } from "@/app/actions/tasks";
import { RecordLabourPaymentButton } from "./_components/RecordLabourPaymentButton";
import { PhotoStrip } from "@/components/photos/PhotoStrip";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VariationStatusBadge } from "../../variations/_components/VariationStatusBadge";
import { BudgetVarianceCard } from "./_components/BudgetVarianceCard";
import { SiteDiarySection } from "./_components/SiteDiarySection";
import { ActionMenu, ActionMenuItem } from "@/components/ActionMenu";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TASK_STATUS_KEYS } from "../../../_components/status-keys";

export const generateMetadata = pageTitle("stages.detail.pageTitle");

export default async function StageDetailPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]">) {
  const { id, stageId } = await params;
  const t = await getT();

  const stage = await getStageDetail(stageId);
  if (!stage || stage.projectId !== id) notFound();

  const [variations, accumulatedMaterialVariance, stagePhotos, diaryEntries] =
    await Promise.all([
      listVariationsForStage(stageId),
      getAccumulatedMaterialVariance(id),
      listPhotos("stage", stageId),
      listSiteDiaryEntries(stageId),
    ]);
  const diaryPhotosByEntry = Object.fromEntries(
    await Promise.all(
      diaryEntries.map(
        async (entry) => [entry.id, await listPhotos("siteDiaryEntry", entry.id)] as const,
      ),
    ),
  );

  return (
    <PageFrame width="working">
      <PageHeader
        crumbs={[{ label: t("stages.crumbs.overview"), href: `/projects/${id}` }]}
        title={stage.name}
        actions={
          <>
            <Button
              variant="secondary"
              href={`/projects/${id}/stages/${stageId}/financial-check`}
            >
              {t("stages.detail.financialCheck")}
            </Button>
            <ActionMenu label={t("stages.detail.actionsMenu")}>
              <ActionMenuItem
                href={`/projects/${id}/stages/${stageId}/edit`}
                icon={<PencilSimple size={20} aria-hidden="true" />}
              >
                {t("stages.detail.editStage")}
              </ActionMenuItem>
              <ActionMenuItem
                href={`/projects/${id}/stages/${stageId}/closeout`}
                icon={<Flag size={20} aria-hidden="true" />}
              >
                {t("stages.detail.closeout")}
              </ActionMenuItem>
            </ActionMenu>
            <Button
              variant="primary"
              href={`/projects/${id}/stages/${stageId}/tasks/new`}
            >
              <Plus size={20} aria-hidden="true" />
              {t("stages.detail.addTask")}
            </Button>
          </>
        }
      />

      {stage.tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("stages.detail.noTasks")}
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
                      <StatusBadge tone="neutral" size="sm">
                        {t(TASK_STATUS_KEYS[task.status])}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.subcontractorName ?? t("stages.detail.task.unassigned")}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${id}/tasks/${task.id}/edit`}
                    className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    <PencilSimple size={16} aria-hidden="true" />
                    {t("stages.detail.task.edit")}
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <ProgressBar
                    percent={task.progressPercent}
                    className="flex-1"
                    label={t("stages.detail.task.progress", { name: task.description })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {task.progressPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">{t("stages.detail.task.labourAgreement")}</p>
                    <Money
                      amount={task.labourAmount ?? 0}
                      className="font-bold text-card-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("stages.detail.task.outstandingLabour")}</p>
                    <Money
                      amount={task.outstandingLabourAmount}
                      className="font-bold text-card-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("stages.detail.task.materialEstimate")}</p>
                    <Money
                      amount={estimatedMaterialCost(task)}
                      className="font-bold text-card-foreground"
                    />
                  </div>
                </div>

                <RecordLabourPaymentButton
                  hasAgreement={task.labourAmount != null}
                  action={recordLabourPaymentAction.bind(
                    null,
                    id,
                    stageId,
                    task.id,
                    `/projects/${id}/stages/${stageId}`,
                  )}
                />
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
          <h2 className="text-xl font-bold text-foreground">{t("stages.detail.variations.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("stages.detail.variations.subtitle")}
          </p>
        </div>
        {stage.tasks.length > 0 && (
          <Button
            variant="secondary"
            href={`/projects/${id}/stages/${stageId}/variations/new`}
          >
            <Plus size={20} aria-hidden="true" />
            {t("stages.detail.variations.raise")}
          </Button>
        )}
      </div>

      {variations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("stages.detail.variations.none")}
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
                      {v.displayNumber ?? t("stages.detail.variations.draft")}
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
                      {t("stages.detail.variations.material")} <Money amount={v.materialImpact} className="font-bold text-card-foreground" />
                    </span>
                  )}
                  {v.labourImpact != null && v.labourImpact !== 0 && (
                    <span className="text-muted-foreground">
                      {t("stages.detail.variations.labour")} <Money amount={v.labourImpact} className="font-bold text-card-foreground" />
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <h2 className="mb-1 text-xl font-bold text-foreground">{t("stages.detail.photos.title")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("stages.detail.photos.intro")}
        </p>
        <PhotoStrip
          photos={stagePhotos}
          uploadAction={uploadStagePhotoAction.bind(null, id, stageId)}
          deleteAction={deletePhotoAction.bind(null, id, stageId)}
          emptyLabel={t("stages.detail.photos.empty")}
        />
      </div>

      <SiteDiarySection
        projectId={id}
        stageId={stageId}
        entries={diaryEntries}
        photosByEntry={diaryPhotosByEntry}
      />
    </PageFrame>
  );
}
