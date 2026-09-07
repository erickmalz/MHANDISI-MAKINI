import {
  FileText,
  HandCoins,
  Truck,
  CheckCircle,
  Package,
  Prohibit,
  Archive,
} from "@phosphor-icons/react/dist/ssr";
import type { POStatus } from "@/lib/procurement-mock";

const STATUS_CONFIG: Record<POStatus, { text: string; bg: string; Icon: typeof FileText }> = {
  Issued: { text: "text-muted-foreground", bg: "bg-muted", Icon: FileText },
  Confirmed: { text: "text-health-blue", bg: "bg-health-blue-bg", Icon: FileText },
  "Partially Delivered": { text: "text-health-amber", bg: "bg-health-amber-bg", Icon: Truck },
  Delivered: { text: "text-health-blue", bg: "bg-health-blue-bg", Icon: Package },
  "Partially Paid": { text: "text-health-amber", bg: "bg-health-amber-bg", Icon: HandCoins },
  Paid: { text: "text-health-green", bg: "bg-health-green-bg", Icon: CheckCircle },
  Cancelled: { text: "text-health-red", bg: "bg-health-red-bg", Icon: Prohibit },
  Closed: { text: "text-muted-foreground", bg: "bg-muted", Icon: Archive },
};

export function POStatusBadge({ status, size = "md" }: { status: POStatus; size?: "sm" | "md" }) {
  const { text, bg, Icon } = STATUS_CONFIG[status];
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-2 py-1 text-sm";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded font-bold ${padding} ${text} ${bg}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {status}
    </span>
  );
}
