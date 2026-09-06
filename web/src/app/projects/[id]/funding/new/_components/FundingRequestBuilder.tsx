"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { Project } from "@/lib/types";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { tasksForStage, materialTotal, labourTotal, type TaskLine } from "@/lib/funding-mock";
import { today } from "@/lib/format";

const STEP_LABELS = ["Stage", "Tasks", "Materials", "Labour", "Fee", "Review", "Issue"] as const;

/** The one dominant action for each step — a specific verb and object. */
const NEXT_LABEL: Record<number, string> = {
  1: "Continue to tasks",
  2: "Continue to materials",
  3: "Continue to labour",
  4: "Continue to the fee",
  5: "Continue to review",
  6: "Continue to issue",
};

export function FundingRequestBuilder({ project }: { project: Project }) {
  const fundableStages = project.stages.filter(
    (s) => s.status !== "Completed" && s.status !== "Cancelled"
  );
  const [stageId, setStageId] = useState(fundableStages[0]?.id ?? project.stages[0].id);
  const stage = project.stages.find((s) => s.id === stageId) ?? project.stages[0];

  const allTasks = useMemo(() => tasksForStage(stage), [stage]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    () => new Set(allTasks.map((t) => t.id))
  );
  const [step, setStep] = useState(1);
  const [issued, setIssued] = useState(false);
  const [requestNumber] = useState(
    () =>
      `FR-${new Date().getFullYear()}-${project.code.slice(-3)}-${String(stage.seq).padStart(2, "0")}`
  );

  const selectedTasks: TaskLine[] = allTasks.filter((t) => selectedTaskIds.has(t.id));
  const materialSubtotal = selectedTasks.reduce((sum, t) => sum + materialTotal(t), 0);
  const labourSubtotal = selectedTasks.reduce((sum, t) => sum + labourTotal(t), 0);
  const feeAmount = stage.financials.remainingFee;
  const totalRequested = materialSubtotal + labourSubtotal;

  function toggleTask(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const goNext = () => setStep((s) => Math.min(7, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const canProceedFromTasks = selectedTaskIds.size > 0;

  return (
    <div>
      <StepIndicator steps={STEP_LABELS} currentStep={step} />

      {step === 1 && (
        <StepCard title="Select the stage to fund">
          <div className="flex flex-col gap-3">
            {fundableStages.map((s) => (
              <label
                key={s.id}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 ${
                  s.id === stageId ? "border-border-strong bg-muted" : "border-border"
                }`}
              >
                <span>
                  <span className="font-bold text-card-foreground">
                    {s.seq}. {s.name}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">{s.status}</span>
                </span>
                <input
                  type="radio"
                  name="stage"
                  className="h-5 w-5 accent-[var(--mm-charcoal)]"
                  checked={s.id === stageId}
                  onChange={() => setStageId(s.id)}
                />
              </label>
            ))}
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Select the tasks to include">
          <div className="flex flex-col gap-3">
            {allTasks.map((t) => (
              <label
                key={t.id}
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 ${
                  selectedTaskIds.has(t.id) ? "border-border-strong bg-muted" : "border-border"
                }`}
              >
                <span className="font-bold text-card-foreground">{t.name}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--mm-charcoal)]"
                  checked={selectedTaskIds.has(t.id)}
                  onChange={() => toggleTask(t.id)}
                />
              </label>
            ))}
          </div>
          {!canProceedFromTasks && (
            <p className="mt-3 text-sm font-bold text-destructive">
              Select at least one task to continue.
            </p>
          )}
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          title="Material requirements"
          subtitle="Pulled automatically from the selected tasks' take-off."
        >
          <LineTable
            rows={selectedTasks.flatMap((t) =>
              t.material.map((m) => ({
                label: `${t.name} — ${m.item}`,
                detail: `${m.qty} ${m.unit} × ${m.unitCost.toLocaleString("en-US")}`,
                amount: m.qty * m.unitCost,
              }))
            )}
            total={materialSubtotal}
          />
        </StepCard>
      )}

      {step === 4 && (
        <StepCard
          title="Labour requirements"
          subtitle="Pulled automatically from the selected tasks' labour agreements."
        >
          <LineTable
            rows={selectedTasks.flatMap((t) =>
              t.labour.map((l) => ({
                label: `${t.name} — ${l.subcontractor}`,
                amount: l.amount,
              }))
            )}
            total={labourSubtotal}
          />
        </StepCard>
      )}

      {step === 5 && (
        <StepCard title="Supervision fee">
          <LineTable
            rows={[{ label: "Supervision fee for this stage", amount: feeAmount }]}
            total={feeAmount}
          />
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Shown here for client transparency only. The fee is billed separately
            via its own Fee Invoice and is not included in the amount requested
            below.
          </p>
        </StepCard>
      )}

      {step === 6 && (
        <StepCard title="Review">
          <LineTable
            rows={[
              { label: "Materials", amount: materialSubtotal },
              { label: "Labour", amount: labourSubtotal },
            ]}
            total={totalRequested}
            totalLabel="Total requested (deposit)"
          />
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">
              Supervision fee (billed separately)
            </span>
            <Money amount={feeAmount} className="font-bold text-card-foreground" />
          </div>
        </StepCard>
      )}

      {step === 7 && (
        <StepCard title={issued ? "Funding request issued" : "Generate and issue"}>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-lg font-bold text-foreground">
                  Funding request {requestNumber}
                </p>
                <p className="text-sm text-muted-foreground">{today()}</p>
              </div>
              {issued && (
                <span className="inline-flex items-center gap-2 rounded bg-health-green-bg px-2 py-1 text-sm font-bold text-health-green">
                  <CheckCircle size={16} aria-hidden="true" />
                  Marked as issued
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <SummaryField label="Project" value={project.name} />
              <SummaryField label="Client" value={project.clientName} />
              <SummaryField label="Site" value={project.site} />
              <SummaryField label="Stage" value={stage.name} />
            </dl>

            <div className="mt-5">
              <LineTable
                rows={[
                  { label: "Materials", amount: materialSubtotal },
                  { label: "Labour", amount: labourSubtotal },
                ]}
                total={totalRequested}
                totalLabel="Total requested"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Supervision fee (billed separately via Fee Invoice)</span>
              <Money amount={feeAmount} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Payment instructions: bank transfer, mobile money, or cheque —
              details on file with the client.
            </p>
          </div>

          {!issued ? (
            <div className="mt-5">
              <Button variant="primary" type="button" onClick={() => setIssued(true)}>
                Issue to client
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Marked as issued on this device on {today()}. Sending the request
                to the client is not wired up in this prototype.
              </p>
              <Link
                href={`/projects/${project.id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-foreground underline"
              >
                Return to project overview
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </StepCard>
      )}

      {!(step === 7 && issued) && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" type="button" onClick={goBack} disabled={step === 1}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Button>
          {step < 7 && (
            <Button
              variant="primary"
              type="button"
              onClick={goNext}
              disabled={step === 2 && !canProceedFromTasks}
            >
              {NEXT_LABEL[step]}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function LineTable({
  rows,
  total,
  totalLabel = "Subtotal",
}: {
  rows: { label: string; detail?: string; amount: number }[];
  total: number;
  totalLabel?: string;
}) {
  return (
    <div>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span>
              <span className="text-card-foreground">{r.label}</span>
              {r.detail && (
                <span className="ml-2 text-sm text-muted-foreground">{r.detail}</span>
              )}
            </span>
            <Money amount={r.amount} className="font-bold text-card-foreground" />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="font-bold text-card-foreground">{totalLabel}</span>
        <Money amount={total} className="text-lg font-bold text-card-foreground" />
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold text-card-foreground">{value}</dd>
    </div>
  );
}
