"use client";

import { Check } from "@phosphor-icons/react/dist/ssr";

import { useT } from "@/lib/i18n/client";

export function StepIndicator({
  steps,
  currentStep,
}: {
  steps: readonly string[];
  currentStep: number;
}) {
  const t = useT();
  return (
    <ol className="mb-6 flex flex-wrap gap-x-2 gap-y-3" aria-label={t("common.steps")}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isCurrent
                  ? "bg-accent text-on-accent"
                  : isDone
                    ? "bg-primary text-on-primary"
                    : "bg-muted text-muted-foreground"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isDone ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                stepNum
              )}
            </span>
            <span
              className={`text-sm ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {stepNum < steps.length && (
              <span
                className="mx-1 hidden h-px w-6 bg-border sm:inline-block"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
