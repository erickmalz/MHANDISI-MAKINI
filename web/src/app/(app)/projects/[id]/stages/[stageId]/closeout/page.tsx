import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { closeStageAction, resolveSurplusMaterialsAction } from "@/app/actions/stage-closeout";
import {
  getAccumulatedMaterialVariance,
  getProjectOverview,
  getStageCloseoutGates,
  getStageDetail,
  getStockBalances,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  feeOutstanding,
  forecastFundingRequirement,
  supervisorFeePosition,
} from "@/lib/finance";
import { stageStatusLabel } from "@/lib/project-view";
import { CLOSEABLE_STAGE_STATUSES, canCloseStage } from "@/lib/stage-closeout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { BudgetVarianceCard } from "../_components/BudgetVarianceCard";
import { SurplusMaterialsForm } from "./_components/SurplusMaterialsForm";

const CLOSE_ERROR_MESSAGES: Record<string, string> = {
  "not-found": "This stage could not be found.",
  "not-closeable-status":
    "This stage is not Active or Ready for Closeout, so Close Stage is unavailable.",
  "gates-failed":
    "This stage still has open items blocking closeout — check the checklist below.",
};

export default async function StageCloseoutPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/stages/[stageId]/closeout">) {
  const { id, stageId } = await params;
  const { closeError } = await searchParams;

  const [stage, gates] = await Promise.all([
    getStageDetail(stageId),
    getStageCloseoutGates(stageId),
  ]);
  if (!stage || stage.projectId !== id || !gates) notFound();

  const [accumulatedMaterialVariance, stock, project] = await Promise.all([
    getAccumulatedMaterialVariance(id),
    getStockBalances(id),
    getProjectOverview(id),
  ]);

  const isClosed = stage.status === "completed";
  const closeableFromStatus = CLOSEABLE_STAGE_STATUSES.has(stage.status);
  const canClose = canCloseStage(stage.status, gates);
  const nextStage = project?.stages.find((s) => s.seq === stage.seq + 1) ?? null;

  const ffr = forecastFundingRequirement(stage.financials);
  const fee = supervisorFeePosition(stage.financials);
  const errorMessage = typeof closeError === "string" ? CLOSE_ERROR_MESSAGES[closeError] : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.name}
      </Link>

      <header className="mb-6">
        <p className="text-sm text-muted-foreground">
          Stage {stage.seq} &middot; {stage.projectName}
        </p>
        <h1 className="text-[1.75rem] font-bold text-foreground">
          Stage Closeout — {stage.name}
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          A controlled review before this stage is marked Completed —
          distinct from simply picking &ldquo;Completed&rdquo; on the stage
          form. Four checks below must all clear before{" "}
          <span className="font-bold text-foreground">Close Stage</span> is
          available; everything else is shown for the Engineer&rsquo;s own
          review only.
        </p>
      </header>

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
            Closed{stage.completedOn ? ` on ${formatDate(stage.completedOn)}` : ""}.
            Its budget is frozen — a real change now goes through a Variation
            or a superseding Funding Request on the next stage.
          </p>
        </Card>
      )}

      {!isClosed && !closeableFromStatus && (
        <Card className="mb-6 border-health-amber bg-health-amber-bg">
          <p className="flex items-center gap-2 text-sm font-bold text-health-amber">
            <Info size={18} aria-hidden="true" />
            This stage is {stageStatusLabel(stage.status)}. Close Stage is
            only available once it is Active or Ready for Closeout.
          </p>
        </Card>
      )}

      {/* --- Hard-blocking checklist (ticket 05 §1) --------------------- */}
      <Card className="mb-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-card-foreground">
          Closeout checks
        </h2>
        <ul className="flex flex-col gap-3">
          <ChecklistItem
            ok={gates.openTasks.length === 0}
            label="Every task is complete or cancelled"
          >
            {gates.openTasks.length > 0 && (
              <TaskList items={gates.openTasks} projectId={id} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.nonTerminalVariations.length === 0}
            label="No outstanding variations"
          >
            {gates.nonTerminalVariations.length > 0 && (
              <VariationList items={gates.nonTerminalVariations} projectId={id} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.orderedPurchaseOrders.length === 0}
            label="No purchase order still ordered (closed or cancelled instead)"
          >
            {gates.orderedPurchaseOrders.length > 0 && (
              <PurchaseOrderList items={gates.orderedPurchaseOrders} projectId={id} />
            )}
          </ChecklistItem>
          <ChecklistItem
            ok={gates.openLabourCommitments === 0}
            label="Labour agreements fully paid"
          >
            {gates.openLabourCommitments > 0 && (
              <p className="text-sm text-muted-foreground">
                <Money amount={gates.openLabourCommitments} /> still owed
                across this stage&rsquo;s tasks.
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
              Close Stage
            </Button>
            {!canClose && closeableFromStatus && (
              <p className="mt-2 text-sm text-muted-foreground">
                Resolve every item above to enable Close Stage.
              </p>
            )}
          </form>
        )}
      </Card>

      {/* --- Informational-only groups (ticket 05 §1) -------------------- */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">Client Funds</h3>
          <InfoRow label="Client deposits" value={<Money amount={stage.financials.clientDeposits} />} />
          <InfoRow
            label="Stage funding position"
            value={
              <Money
                amount={ffr}
                negativeClassName="font-bold text-health-green"
                className={ffr > 0 ? "font-bold text-health-red" : "font-bold text-health-green"}
              />
            }
            hint={ffr > 0 ? "Additional funding required" : "Current funding adequate"}
          />
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">Supervisor Fee</h3>
          <InfoRow label="Invoiced" value={<Money amount={fee.invoiced} />} />
          <InfoRow label="Received" value={<Money amount={fee.received} />} />
          <InfoRow
            label="Outstanding"
            value={<Money amount={feeOutstanding(stage.financials)} />}
            hint="Never blocks closeout (Phase 1 decision 03)."
          />
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">Materials</h3>
          <p className="text-sm text-muted-foreground">
            Deliveries and remaining quantities reconcile through the Budget
            Variance card below — over/under-delivery is reconciled at
            closeout, not a precondition for it.
          </p>
          <div>
            <p className="text-sm font-bold text-card-foreground">
              Surplus materials on site (project-wide)
            </p>
            {stock.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
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
            View Material Stock
          </Link>
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-card-foreground">Labour</h3>
          <p className="text-sm text-muted-foreground">Retention: not used.</p>
        </Card>
        <Card className="flex flex-col gap-2 sm:col-span-2">
          <h3 className="text-sm font-bold text-card-foreground">Documents</h3>
          <p className="text-sm text-muted-foreground">
            Receipts and delivery notes attach per Purchase Order — an
            optional record, not a mandatory one. Every Issued Funding
            Request is already immutable by construction, so its record is
            preserved automatically.
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
              Next steps
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {nextStage ? (
                <Button variant="secondary" href={`/projects/${id}/stages/${nextStage.id}`}>
                  Go to Stage {nextStage.seq} — {nextStage.name}
                </Button>
              ) : (
                <Button variant="primary" href={`/projects/${id}/stages/new`}>
                  Create Next Stage
                </Button>
              )}
              {nextStage && (
                <Button
                  variant="secondary"
                  href={`/projects/${id}/funding/new?stageId=${nextStage.id}`}
                >
                  Create Next Stage Funding Request
                </Button>
              )}
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Carry Forward Approved Client Float — nothing to do here.
              Available Float continues automatically into the next stage;
              it is a live per-project figure, not a balance held inside this
              closed stage.
            </p>
          </Card>

          <SurplusMaterialsForm
            action={resolveSurplusMaterialsAction.bind(null, id, stageId)}
            stock={stock}
          />
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
        {hint && <span className="block text-xs">{hint}</span>}
      </span>
      {value}
    </div>
  );
}

function TaskList({
  items,
  projectId,
}: {
  items: { id: string; seq: number; description: string }[];
  projectId: string;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((t) => (
        <li key={t.id}>
          <Link href={`/projects/${projectId}/tasks/${t.id}/edit`} className="underline">
            {t.seq}. {t.description}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function VariationList({
  items,
  projectId,
}: {
  items: { id: string; displayNumber: string | null; status: string; description: string }[];
  projectId: string;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((v) => (
        <li key={v.id}>
          <Link href={`/projects/${projectId}/variations/${v.id}`} className="underline">
            {v.displayNumber ?? "Draft"} — {v.description} ({v.status})
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PurchaseOrderList({
  items,
  projectId,
}: {
  items: { id: string; displayNumber: string | null }[];
  projectId: string;
}) {
  return (
    <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
      {items.map((po) => (
        <li key={po.id}>
          <Link href={`/projects/${projectId}/procurement/${po.id}`} className="underline">
            {po.displayNumber ?? "Purchase order"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
