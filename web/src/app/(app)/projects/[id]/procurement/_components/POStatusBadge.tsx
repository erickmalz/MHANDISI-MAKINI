"use client";

import {
  FileText,
  PencilSimpleLine,
  HandCoins,
  Truck,
  CheckCircle,
  Package,
  Prohibit,
  Archive,
} from "@phosphor-icons/react/dist/ssr";
import { StatusBadge, type BadgeIcon, type StatusTone } from "@/components/ui/StatusBadge";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/types";
import type { POStatus } from "@/lib/procurement";

const STATUS_CONFIG: Record<POStatus, { tone: StatusTone; Icon: BadgeIcon; label: MessageKey }> = {
  Planned: { tone: "neutral", Icon: PencilSimpleLine, label: "procurement.status.planned" },
  Ordered: { tone: "info", Icon: FileText, label: "procurement.status.ordered" },
  "Partially Delivered": { tone: "warning", Icon: Truck, label: "procurement.status.partiallyDelivered" },
  Delivered: { tone: "info", Icon: Package, label: "procurement.status.delivered" },
  "Partially Paid": { tone: "warning", Icon: HandCoins, label: "procurement.status.partiallyPaid" },
  Paid: { tone: "success", Icon: CheckCircle, label: "procurement.status.paid" },
  Cancelled: { tone: "danger", Icon: Prohibit, label: "procurement.status.cancelled" },
  Closed: { tone: "neutral", Icon: Archive, label: "procurement.status.closed" },
};

export function POStatusBadge({ status, size = "md" }: { status: POStatus; size?: "sm" | "md" }) {
  const t = useT();
  const { tone, Icon, label } = STATUS_CONFIG[status];
  return (
    <StatusBadge tone={tone} icon={Icon} size={size}>
      {t(label)}
    </StatusBadge>
  );
}
