import type { ReactNode } from "react";

import type { Translator } from "@/lib/i18n/translate";
import { stageStatusLabel } from "@/lib/project-view";

const STAGE_STATUS_KEYS = {
  planned: "closeout.stageStatus.planned",
  active: "closeout.stageStatus.active",
  awaiting_funding: "closeout.stageStatus.awaiting_funding",
  on_hold: "closeout.stageStatus.on_hold",
  ready_for_closeout: "closeout.stageStatus.ready_for_closeout",
  completed: "closeout.stageStatus.completed",
  cancelled: "closeout.stageStatus.cancelled",
} as const;

const VARIATION_STATUS_KEYS = {
  draft: "closeout.variationStatus.draft",
  approved: "closeout.variationStatus.approved",
  rejected: "closeout.variationStatus.rejected",
  cancelled: "closeout.variationStatus.cancelled",
} as const;

/** The stage status (a stored DB value) as words in the reader's language. */
export function stageStatusText(t: Translator, dbValue: string): string {
  return dbValue in STAGE_STATUS_KEYS
    ? t(STAGE_STATUS_KEYS[dbValue as keyof typeof STAGE_STATUS_KEYS])
    : stageStatusLabel(dbValue);
}

/** The variation status (a stored value) as words in the reader's language. */
export function variationStatusText(t: Translator, value: string): string {
  return value in VARIATION_STATUS_KEYS
    ? t(VARIATION_STATUS_KEYS[value as keyof typeof VARIATION_STATUS_KEYS])
    : value;
}

/**
 * Bolds `fragment` inside an already-translated `text` without splitting the
 * sentence into separately translated pieces (word order differs by language).
 */
export function emphasise(text: string, fragment: string): ReactNode {
  const [before, ...rest] = text.split(fragment);
  if (rest.length === 0) return text;
  return (
    <>
      {before}
      <span className="font-bold text-foreground">{fragment}</span>
      {rest.join(fragment)}
    </>
  );
}
