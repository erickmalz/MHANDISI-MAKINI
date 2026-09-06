import {
  CheckCircle,
  Warning,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import type { FinancialHealth } from "@/lib/types";

const HEALTH_CONFIG: Record<
  FinancialHealth,
  { label: string; text: string; bg: string; Icon: typeof CheckCircle }
> = {
  green: {
    label: "Comfortable",
    text: "text-health-green",
    bg: "bg-health-green-bg",
    Icon: CheckCircle,
  },
  amber: {
    label: "Tight",
    text: "text-health-amber",
    bg: "bg-health-amber-bg",
    Icon: Warning,
  },
  red: {
    label: "Underfunded",
    text: "text-health-red",
    bg: "bg-health-red-bg",
    Icon: WarningCircle,
  },
  blue: {
    label: "Funding pending",
    text: "text-health-blue",
    bg: "bg-health-blue-bg",
    Icon: Clock,
  },
};

export function HealthBadge({
  health,
  size = "md",
}: {
  health: FinancialHealth;
  size?: "sm" | "md";
}) {
  const { label, text, bg, Icon } = HEALTH_CONFIG[health];
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-2 py-1 text-sm";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded font-bold ${padding} ${text} ${bg}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {label}
    </span>
  );
}
