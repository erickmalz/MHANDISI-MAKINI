import Link from "next/link";
import { Warning, WarningCircle, Info } from "@phosphor-icons/react/dist/ssr";

import type { ProjectAlert } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { OverviewPanel } from "./OverviewPanel";
import { sortAlertsBySeverity } from "./overview";

const SEVERITY_CONFIG = {
  critical: {
    Icon: WarningCircle,
    labelKey: "overview.alerts.severity.critical",
    className: "text-health-red bg-health-red-bg",
  },
  warning: {
    Icon: Warning,
    labelKey: "overview.alerts.severity.warning",
    className: "text-health-amber bg-health-amber-bg",
  },
  info: {
    Icon: Info,
    labelKey: "overview.alerts.severity.info",
    className: "text-health-blue bg-health-blue-bg",
  },
} as const satisfies Record<string, { Icon: unknown; labelKey: MessageKey; className: string }>;

/**
 * The project's unresolved alerts as a to-do list, most urgent first, each
 * with a way straight to the record it is about (guidelines §33).
 */
export async function ToDoList({ alerts }: { alerts: ProjectAlert[] }) {
  const t = await getT();
  return (
    <OverviewPanel
      id="alerts"
      headingId="overview-todo"
      title={t("overview.alerts.title")}
      aside={
        alerts.length > 0 && (
          <span className="text-sm font-bold">
            {t("overview.alerts.summary", { count: alerts.length })}
          </span>
        )
      }
    >
      {alerts.length === 0 ? (
        <p className="px-4 py-5 text-muted-foreground md:px-5">{t("overview.alerts.none")}</p>
      ) : (
        <ol>
          {sortAlertsBySeverity(alerts).map((alert) => {
            const { Icon, labelKey, className } = SEVERITY_CONFIG[alert.severity];
            return (
              <li
                key={alert.id}
                className="flex flex-col items-start gap-2 border-b border-border px-4 py-3 last:border-b-0 md:px-5 @lg:grid @lg:grid-cols-[9rem_minmax(0,1fr)_auto] @lg:items-center @lg:gap-4"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-bold ${className}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {t(labelKey)}
                </span>
                <span className="text-card-foreground">{alert.message}</span>
                {alert.href && (
                  <Link
                    href={alert.href}
                    className="inline-flex min-h-11 items-center rounded-lg border border-foreground px-4 text-sm font-bold text-foreground hover:bg-muted"
                  >
                    {t("overview.alerts.view")}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </OverviewPanel>
  );
}
