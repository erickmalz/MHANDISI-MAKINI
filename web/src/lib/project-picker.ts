/**
 * Pure helpers for the project picker: which projects need attention, in what
 * order to list them, and the text filter. The picker only ever shows a
 * project's identity, its financial health badge and its alert count — never
 * figures — so a project's money is never set beside another's.
 */
import type { FinancialHealth } from "./types";

export interface PickerItem {
  id: string;
  code: string;
  name: string;
  clientName: string;
  site: string;
  /** Health of the current stage; `null` when the project has no stage yet. */
  health: FinancialHealth | null;
  alertCount: number;
}

/** The filter box only appears once there are more projects than this. */
export const FILTER_THRESHOLD = 6;

const HEALTH_RANK: Record<FinancialHealth, number> = {
  red: 0,
  amber: 1,
  blue: 2,
  green: 3,
};

/** Red or amber health, or any unresolved alert. */
export function needsAttention(item: PickerItem): boolean {
  return item.health === "red" || item.health === "amber" || item.alertCount > 0;
}

function healthRank(item: PickerItem): number {
  return item.health === null ? 4 : HEALTH_RANK[item.health];
}

/** Worst health first, then more alerts, then name. Does not mutate its input. */
export function sortByAttention(items: PickerItem[]): PickerItem[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        healthRank(a) - healthRank(b) ||
        b.alertCount - a.alertCount ||
        a.name.localeCompare(b.name),
    );
}

/** Case-insensitive match on name, code, client and site. Empty query keeps all. */
export function filterProjects(items: PickerItem[], query: string): PickerItem[] {
  const q = query.trim().toLowerCase();
  if (q === "") return items;
  return items.filter((item) =>
    [item.name, item.code, item.clientName, item.site].some((field) =>
      field.toLowerCase().includes(q),
    ),
  );
}

export interface PickerGroups {
  attention: PickerItem[];
  rest: PickerItem[];
}

/** Sorted, then split into "needs attention" and everything else. */
export function groupByAttention(items: PickerItem[]): PickerGroups {
  const sorted = sortByAttention(items);
  return {
    attention: sorted.filter(needsAttention),
    rest: sorted.filter((item) => !needsAttention(item)),
  };
}
