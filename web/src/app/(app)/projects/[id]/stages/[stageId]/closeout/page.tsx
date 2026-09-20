import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { closeStageAction, resolveSurplusMaterialsAction } from "@/app/actions/stage-closeout";
import {
  getAccumulatedMaterialVariance,
  getProjectOverview,
  getStageCloseoutGates,
  getStageCloseoutReportSummary,
  getStageDetail,
  getStockBalances,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  feeOutstanding,
  forecastFundingRequirement,
  formatTZS,
  supervisorFeePosition,
} from "@/lib/finance";
import { CLOSEABLE_STAGE_STATUSES, canCloseStage } from "@/lib/stage-closeout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { DocumentDownloads } from "@/components/DocumentDownloads";
import { BudgetVarianceCard } from "../_components/BudgetVarianceCard";
import { SurplusMaterialsForm } from "./_components/SurplusMaterialsForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale, getT, pageTitle } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { emphasise, stageStatusText, variationStatusText } from "@/app/(app)/projects/[id]/closeout/_components/closeout-text";

export const generateMetadata = pageTitle("closeout.stage.pageTitle");

// The URL carries a short error code; each maps to a catalogue message.
const CLOSE_ERROR_KEYS = {
  "not-found": "closeout.stage.errors.notFound",
  "not-closeable-status": "closeout.stage.errors.notCloseable",
  "gates-failed": "closeout.stage.errors.gatesFailed",
} as const;

export default async function StageCloseoutPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/stages/[stageId]/closeout">) {
  const { id, stageId } = await params;
  const { closeError } = await searchParams;

  const [stage, gates, t, locale] = await Promise.all([
    getStageDetail(stageId),
    getStageCloseoutGates(stageId),
    getT(),
    getLocale(),
  ]);
  if (!stage || stage.projectId !== id || !gates) notFound();

  const [accumulatedMaterialVariance, stock, project, closeoutReport] = await Promise.all([
    getAccumulatedMaterialVariance(id),
    getStockBalances(id),
    getProjectOverview(id),
    getStageCloseoutReportSummary(stageId),
  ]);

  const isClosed = stage.status === "completed";
  const closeableFromStatus = CLOSEABLE_STAGE_STATUSES.has(stage.status);
  const canClose = canCloseStage(stage.status, gates);
  const nextStage = project?.stages.find((s) => s.seq === stage.seq + 1) ?? null;

  const ffr = forecastFundingRequirement(stage.financials);
  const fee = supervisorFeePosition(stage.financials);
  const errorMessage =
    typeof closeError === "string" && closeError in CLOSE_ERROR_KEYS
      ? t(CLOSE_ERROR_KEYS[closeError as keyof typeof CLOSE_ERROR_KEYS])
      : undefined;
  const closeAction = t("closeout.stage.closeAction");

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("closeout.crumbOverview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("closeout.stage.pageTitle")}
        subtitle={emphasise(t("closeout.stage.subtitle", { action: closeAction }), closeAction)}
      />

      {errorMessage && (
        <Card className="mb-6 border-health-red bg-health-red-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-red">
            <WarningCircle size={18} aria-hidden="true" />
            {errorMessage}
          </p>
        </Card>
      )}

      {isClosed && (
        <Card className="mb-6 border-health-green bg-health-green-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-green">
            <CheckCircle size={18} aria-hidden="true" />
            {stage.completedOn
              ? t("closeout.stage.closedOn", { date: formatDate(stage.completedOn, locale) })
              : t("closeout.stage.closed")}
          </p>
        </Card>
      )}

      {isClosed && (
        <div className="mb-6">
          {closeoutReport ? (
            <DocumentDownloads
              title={t("closeout.stage.reportTitle")}
              links={[
                {
                  label: t("closeout.stage.reportLabel", { number: closeoutReport.displayNumber }),
                  pdfHref: `/projects/${id}/stages/${stageId}/closeout/document.pdf`,
                  jpgHref: `/projects/${id}/stages/${stageId}/closeout/document.jpg`,
                },
              ]}
            />
          ) : (
            <Card className="border-border bg-muted">
              <h2 className="text-xl font-bold text-card-foreground">
                {t("closeout.stage.reportTitle")}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Info size={18} aria-hidden="true" className="shrink-0" />
                {t("closeout.stage.reportMissing")}
              </p>
            </Card>
          )}
        </div>
      )}

      {!isClosed && !closeableFromStatus && (
        <Card className="mb-6 border-health-amber bg-health-amber-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-amber">
            <Info size={18} aria-hidden="true" />
            {t("closeout.stage.notCloseable", { status: stageStatusText(t, stage.status) })}
          </p>
        </Card>
      )}

      {/* --- Hard-blocking checklist (ticket 05 §1) --------------------- */}
      <Card className="mb-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-card-foreground">
          {t("closeout.stage.checksTitle")}
        </h2>
        <ul className="flex flex-col gap-3">
          <ChecklistItem
            ok={gates.openTasks.length === 0}
            label={t("closeout.stage.checkTasks")}
          >
            {gates.openTasks.length > 0 && (
              <TaskList items={gates.openTasks} projectId={id} t={t} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.nonTerminalVariations.length === 0}
            label={t("closeout.stage.checkVariations")}
          >
            {gates.nonTerminalVariations.length > 0 && (
              <VariationList items={gates.nonTerminalVariations} projectId={id} t={t} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.orderedPurchaseOrders.length === 0}
            label={t("closeout.stage.checkOrders")}
          >
            {gates.orderedPurchaseOrders.length > 0 && (
              <PurchaseOrderList items={gates.orderedPurchaseOrders} projectId={id} t={t} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.openLabourCommitments === 0}
            label={t("closeout.stage.checkLabour")}
          >
            {gates.openLabourCommitments > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("closeout.stage.labourOwed", { amount: formatTZS(gates.openLabourCommitments) })}
              </p>
            )}
          </ChecklistItem>
        </ul>

        {!isClosed && (
          <form
            action={closeStageAction.bind(null, id, stageId)}
            className="border-t border-border pt-4"
          >
            <Button variant="primary" type="submit" disabled={!canClose}>
              {closeAction}
            </Button>
            {!canClose && closeableFromStatus && (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("closeout.stage.resolveAll")}
              </p>
            )}
          </form>
        )}
      </Card>

      {/* --- Informational-only groups (ticket 05 §1) -------------------- */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">{t("closeout.stage.clientFunds")}</h3>
          <InfoRow label={t("closeout.stage.clientDeposits")} value={<Money amount={stage.financials.clientDeposits} />} />
          <InfoRow
            label={t("closeout.stage.fundingPosition")}
            value={
              <Money
                amount={ffr}
                negativeClassName="font-bold text-health-green"
                className={ffr > 0 ? "font-bold text-health-red" : "font-bold text-health-green"}
              />
            }
            hint={ffr > 0 ? t("closeout.stage.needsFunding") : t("closeout.stage.fundingOk")}
          />
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">{t("closeout.stage.supervisorFee")}</h3>
          <InfoRow label={t("closeout.stage.invoiced")} value={<Money amount={fee.invoiced} />} />
          <InfoRow label={t("closeout.stage.received")} value={<Money amount={fee.received} />} />
          <InfoRow
            label={t("closeout.stage.outstanding")}
            value={<Money amount={feeOutstanding(stage.financials)} />}
            hint={t("closeout.stage.feeNeverBlocks")}
          />
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">{t("closeout.stage.materials")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("closeout.stage.materialsBody")}
          </p>
          <div>
            <p className="text-sm font-bold text-card-foreground">
              {t("closeout.stage.surplusOnSite")}
            </p>
            {stock.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("closeout.stage.noneRecorded")}</p>
            ) : (
              <ul className="text-sm text-muted-foreground">
                {stock.map((s) => (
                  <li key={`${s.itemKey}::${s.unit}`} className="capitalize">
                    {s.itemKey} — {s.qty} {s.unit}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href={`/projects/${id}/material-stock`}
            className="text-sm font-bold underline"
          >
            {t("closeout.stage.viewStock")}
          </Link>
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">{t("closeout.stage.labour")}</h3>
          <p className="text-sm text-muted-foreground">{t("closeout.stage.retention")}</p>
        </Card>
        <Card className="flex flex-col gap-2 sm:col-span-2">
          <h3 className="text-sm font-bold text-card-foreground">{t("closeout.stage.documents")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("closeout.stage.documentsBody")}
          </p>
        </Card>
      </div>

      <div className="mb-6">
        <BudgetVarianceCard
          f={stage.financials}
          accumulatedMaterialVariance={accumulatedMaterialVariance}
        />
      </div>

      {/* --- Post-closeout actions (ticket 05 §3) ------------------------ */}
      {isClosed && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-card-foreground">
              {t("closeout.stage.nextSteps")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {nextStage ? (
                <Button variant="secondary" href={`/projects/${id}/stages/${nextStage.id}`}>
                  {t("closeout.stage.goToStage", { seq: nextStage.seq, name: nextStage.name })}
                </Button>
              ) : (
                <Button variant="primary" href={`/projects/${id}/stages/new`}>
                  {t("closeout.stage.createNext")}
                </Button>
              )}
              {nextStage && (
                <Button
                  variant="secondary"
                  href={`/projects/${id}/funding/new?stageId=${nextStage.id}`}
                >
                  {t("closeout.stage.createNextFunding")}
                </Button>
              )}
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t("closeout.stage.carryForwardNote")}
            </p>
          </Card>

          <SurplusMaterialsForm
            action={resolveSurplusMaterialsAction.bind(null, id, stageId)}
            stock={stock}
          />
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

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="block text-sm">{hint}</span>}
      </span>
      {value}
    </div>
  );
}

function TaskList({
  items,
  projectId,
  t,
}: {
  items: { id: string; seq: number; description: string }[];
  projectId: string;
  t: Translator;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((task) => (
        <li key={task.id}>
          <Link href={`/projects/${projectId}/tasks/${task.id}/edit`} className="underline">
            {t("closeout.stage.taskLink", { seq: task.seq, description: task.description })}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function VariationList({
  items,
  projectId,
  t,
}: {
  items: { id: string; displayNumber: string | null; status: string; description: string }[];
  projectId: string;
  t: Translator;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((v) => (
        <li key={v.id}>
          <Link href={`/projects/${projectId}/variations/${v.id}`} className="underline">
            {v.displayNumber ?? t("closeout.stage.draft")} — {v.description} ({variationStatusText(t, v.status)})
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PurchaseOrderList({
  items,
  projectId,
  t,
}: {
  items: { id: string; displayNumber: string | null }[];
  projectId: string;
  t: Translator;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((po) => (
        <li key={po.id}>
          <Link href={`/projects/${projectId}/procurement/${po.id}`} className="underline">
            {po.displayNumber ?? t("closeout.stage.purchaseOrder")}
          </Link>
        </li>
      ))}
    </ul>
  );
}
