"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilSimple, Wallet } from "@phosphor-icons/react/dist/ssr";

import type { ActionState } from "@/lib/forms/action-helpers";
import { useT } from "@/lib/i18n/client";
import type { TaskStatus } from "@/lib/tasks";
import { Money } from "@/components/ui/Money";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { TASK_STATUS_KEYS } from "../../../../_components/status-keys";
import { RecordLabourPaymentForm } from "./RecordLabourPaymentForm";

type Bound = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type TaskCardTask = {
  id: string;
  seq: number;
  description: string;
  status: TaskStatus;
  subcontractorName: string | null;
  progressPercent: number;
  labourAmount: number | null;
  outstandingLabourAmount: number;
  materialEstimate: number;
};

/**
 * A task's status drives both its badge and its progress gauge fill, so the
 * left edge of the task list reads as how far along each task is and which
 * ones need attention.
 */
const STATUS_TONES: Record<TaskStatus, StatusTone> = {
  planned: "neutral",
  active: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "danger",
};

const FILLS: Record<StatusTone, string> = {
  neutral: "bg-control-border",
  info: "bg-health-blue",
  warning: "bg-health-amber",
  success: "bg-health-green",
  danger: "bg-health-red",
};

/**
 * The progress box on the left of a task card: filled from the bottom like a
 * pour level, in the task's status colour. The percentage is drawn twice — the
 * second copy, in the on-fill colour, is clipped to the filled part — so the
 * number stays readable wherever the fill line crosses it.
 */
function PourGauge({ percent, tone, label }: { percent: number; tone: StatusTone; label: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const figure = (
    <>
      {p}
      <span className="text-sm">%</span>
    </>
  );
  return (
    <div
      className="relative min-h-20 overflow-hidden border-r border-border bg-muted"
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`absolute inset-x-0 bottom-0 transition-[height] duration-300 motion-reduce:transition-none ${FILLS[tone]}`}
        style={{ height: `${p}%` }}
      />
      <span className="absolute inset-0 grid place-items-center font-heading text-lg font-extrabold tabular-nums text-card-foreground">
        <span>{figure}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center font-heading text-lg font-extrabold tabular-nums text-on-health"
        style={{ clipPath: `inset(${100 - p}% 0 0 0)` }}
      >
        <span>{figure}</span>
      </span>
    </div>
  );
}

export function TaskCard({
  task,
  editHref,
  recordPaymentAction,
}: {
  task: TaskCardTask;
  editHref: string;
  recordPaymentAction: Bound;
}) {
  const t = useT();
  const [paying, setPaying] = useState(false);
  const tone = STATUS_TONES[task.status];
  const hasAgreement = task.labourAmount != null;
  const payFormId = `record-payment-${task.id}`;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)]">
        <PourGauge
          percent={task.progressPercent}
          tone={tone}
          label={t("stages.detail.task.progress", { name: task.description })}
        />

        <div className="flex flex-col gap-1 py-2.5 pr-2 pl-4">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 pt-2">
              <span className="font-bold leading-snug text-card-foreground">
                <span className="text-muted-foreground">{task.seq}.</span> {task.description}
              </span>
              <StatusBadge tone={tone} size="sm">
                {t(TASK_STATUS_KEYS[task.status])}
              </StatusBadge>
            </div>
            <div className="flex shrink-0 gap-1">
              {hasAgreement && (
                <button
                  type="button"
                  onClick={() => setPaying((v) => !v)}
                  aria-expanded={paying}
                  aria-controls={payFormId}
                  aria-label={t("stages.detail.task.recordPaymentFor", { name: task.description })}
                  title={t("stages.detail.task.recordPayment")}
                  className="inline-grid size-11 cursor-pointer place-items-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground aria-expanded:border-border-strong aria-expanded:bg-muted aria-expanded:text-foreground"
                >
                  <Wallet size={20} aria-hidden="true" />
                </button>
              )}
              <Link
                href={editHref}
                aria-label={t("stages.detail.task.editTask", { name: task.description })}
                title={t("stages.detail.task.edit")}
                className="inline-grid size-11 place-items-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
              >
                <PencilSimple size={20} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-0.5 pr-2 text-sm text-muted-foreground">
            <span className="min-w-36 flex-1">
              {task.subcontractorName ?? t("stages.detail.task.unassigned")}
            </span>
            <span className="whitespace-nowrap">
              {t("stages.detail.task.labourAgreement")}{" "}
              <Money amount={task.labourAmount ?? 0} className="font-bold text-card-foreground" />
            </span>
            <span className="whitespace-nowrap">
              {t("stages.detail.task.outstandingLabour")}{" "}
              <Money
                amount={task.outstandingLabourAmount}
                className={`font-bold ${
                  task.outstandingLabourAmount > 0 ? "text-health-amber" : "text-card-foreground"
                }`}
              />
            </span>
            <span className="whitespace-nowrap">
              {t("stages.detail.task.materialEstimate")}{" "}
              <Money amount={task.materialEstimate} className="font-bold text-card-foreground" />
            </span>
          </div>
        </div>
      </div>

      {hasAgreement && paying && (
        <RecordLabourPaymentForm
          id={payFormId}
          action={recordPaymentAction}
          onCancel={() => setPaying(false)}
        />
      )}
    </article>
  );
}
