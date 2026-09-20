"use client";

import {
  Archive,
  CheckCircle,
  HandCoins,
  PaperPlaneTilt,
  PencilSimpleLine,
  Prohibit,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { StatusBadge, type BadgeIcon, type StatusTone } from "@/components/ui/StatusBadge";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { FRStatus } from "@/lib/funding";

const STATUS_CONFIG: Record<FRStatus, { tone: StatusTone; Icon: BadgeIcon; label: MessageKey }> = {
  Draft: { tone: "neutral", Icon: PencilSimpleLine, label: "funding.status.draft" },
  Issued: { tone: "info", Icon: PaperPlaneTilt, label: "funding.status.issued" },
  "Partially Deposited": {
    tone: "warning",
    Icon: HandCoins,
    label: "funding.status.partiallyDeposited",
  },
  Deposited: { tone: "success", Icon: CheckCircle, label: "funding.status.deposited" },
  Superseded: { tone: "neutral", Icon: Stack, label: "funding.status.superseded" },
  Cancelled: { tone: "danger", Icon: Prohibit, label: "funding.status.cancelled" },
  Closed: { tone: "neutral", Icon: Archive, label: "funding.status.closed" },
};

export function FRStatusBadge({
  status,
  size = "md",
}: {
  status: FRStatus;
  size?: "sm" | "md";
}) {
  const t = useT();
  const { tone, Icon, label } = STATUS_CONFIG[status];
  return (
    <StatusBadge tone={tone} icon={Icon} size={size}>
      {t(label)}
    </StatusBadge>
  );
}
