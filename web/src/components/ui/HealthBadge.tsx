"use client";

import {
  CheckCircle,
  Warning,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import type { FinancialHealth } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import { StatusBadge, type StatusTone } from "./StatusBadge";

const HEALTH_CONFIG: Record<
  FinancialHealth,
  { label: MessageKey; tone: StatusTone; Icon: typeof CheckCircle }
> = {
  green: { label: "common.health.comfortable", tone: "success", Icon: CheckCircle },
  amber: { label: "common.health.tight", tone: "warning", Icon: Warning },
  red: { label: "common.health.underfunded", tone: "danger", Icon: WarningCircle },
  blue: { label: "common.health.pending", tone: "info", Icon: Clock },
};

export function HealthBadge({
  health,
  size = "md",
}: {
  health: FinancialHealth;
  size?: "sm" | "md";
}) {
  const t = useT();
  const { label, tone, Icon } = HEALTH_CONFIG[health];
  return (
    <StatusBadge tone={tone} icon={Icon} size={size}>
      {t(label)}
    </StatusBadge>
  );
}
