"use client";

import type { ReactNode } from "react";

import { useT } from "@/lib/i18n/client";
import { translateIfKey } from "@/lib/i18n/translate";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";

/**
 * A short message about what just happened — always icon + words, never colour
 * alone, and announced to assistive tech.
 *
 * - `error` uses `role="alert"` (interrupts): a save or submit that failed.
 * - `success` and `info` use `role="status"` (polite): a confirmed result.
 *
 * The live region has to exist in the DOM before its text changes to be
 * announced reliably, so render `<Notice>` conditionally only for messages
 * that appear after an action (as the forms do). Say "Saved" only once the
 * action is confirmed, and give errors a next step.
 */
const TONES = {
  error: {
    Icon: WarningCircle,
    role: "alert",
    className: "bg-health-red-bg text-health-red",
  },
  success: {
    Icon: CheckCircle,
    role: "status",
    className: "bg-health-green-bg text-health-green",
  },
  info: {
    Icon: Info,
    role: "status",
    className: "bg-health-blue-bg text-health-blue",
  },
} as const;

export function Notice({
  tone,
  children,
  className = "",
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  const { Icon, role, className: toneClass } = TONES[tone];
  return (
    <div
      role={role}
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-bold ${toneClass} ${className}`.trim()}
    >
      <Icon size={20} aria-hidden="true" className="mt-px shrink-0" />
      <div className="min-w-0">{typeof children === "string" ? translateIfKey(t, children) : children}</div>
    </div>
  );
}
