import { Warning, WarningCircle, Info } from "@phosphor-icons/react/dist/ssr";
import type { ProjectAlert } from "@/lib/types";
import { Card } from "@/components/ui/Card";

const SEVERITY_CONFIG = {
  critical: {
    Icon: WarningCircle,
    label: "Action needed",
    className: "text-health-red bg-health-red-bg",
  },
  warning: {
    Icon: Warning,
    label: "Attention",
    className: "text-health-amber bg-health-amber-bg",
  },
  info: {
    Icon: Info,
    label: "Note",
    className: "text-health-blue bg-health-blue-bg",
  },
} as const;

export function AlertsList({ alerts }: { alerts: ProjectAlert[] }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">Alerts</h2>
      {alerts.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          No unresolved alerts for this project.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {alerts.map((alert) => {
            const { Icon, label, className } = SEVERITY_CONFIG[alert.severity];
            return (
              <li key={alert.id} className="flex items-start gap-3">
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-bold ${className}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </span>
                <span className="text-card-foreground">{alert.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
