import Link from "next/link";
import { Warning, WarningCircle, Info } from "@phosphor-icons/react/dist/ssr";
import type { ProjectAlert } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { sortAlertsBySeverity } from "./overview";

/** Shared with `StatusBand` so an alert reads the same in both places. */
export const SEVERITY_CONFIG = {
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

export async function AlertsList({ alerts }: { alerts: ProjectAlert[] }) {
  const t = await getT();
  return (
    <Card id="alerts">
      <h2 className="text-xl font-bold text-card-foreground">{t("overview.alerts.title")}</h2>
      {alerts.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("overview.alerts.none")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {sortAlertsBySeverity(alerts).map((alert) => {
            const { Icon, labelKey, className } = SEVERITY_CONFIG[alert.severity];
            return (
              <li key={alert.id} className="flex items-start gap-3">
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-sm font-bold ${className}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {t(labelKey)}
                </span>
                <span className="text-card-foreground">
                  {alert.message}
                  {alert.href && (
                    <>
                      {" "}
                      <Link href={alert.href} className="font-bold underline">
                        {t("overview.alerts.view")}
                      </Link>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
