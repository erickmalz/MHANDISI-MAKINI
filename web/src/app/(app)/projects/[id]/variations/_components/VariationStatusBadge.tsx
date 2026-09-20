"use client";

import {
  CheckCircle,
  PencilSimpleLine,
  Prohibit,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { StatusBadge, type BadgeIcon, type StatusTone } from "@/components/ui/StatusBadge";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { VariationStatus } from "@/lib/variations";

const STATUS_CONFIG: Record<VariationStatus, { tone: StatusTone; Icon: BadgeIcon; label: MessageKey }> = {
  draft: { tone: "neutral", Icon: PencilSimpleLine, label: "variations.status.draft" },
  approved: { tone: "success", Icon: CheckCircle, label: "variations.status.approved" },
  rejected: { tone: "danger", Icon: XCircle, label: "variations.status.rejected" },
  cancelled: { tone: "neutral", Icon: Prohibit, label: "variations.status.cancelled" },
};

export function VariationStatusBadge({
  status,
  size = "md",
}: {
  status: VariationStatus;
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
