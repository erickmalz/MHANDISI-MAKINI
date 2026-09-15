import {
  CheckCircle,
  PencilSimpleLine,
  Prohibit,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { VariationStatus } from "@/lib/variations";
import { variationStatusLabel } from "@/lib/variations";

const STATUS_CONFIG: Record<
  VariationStatus,
  { text: string; bg: string; Icon: typeof CheckCircle }
> = {
  draft: { text: "text-muted-foreground", bg: "bg-muted", Icon: PencilSimpleLine },
  approved: { text: "text-health-green", bg: "bg-health-green-bg", Icon: CheckCircle },
  rejected: { text: "text-health-red", bg: "bg-health-red-bg", Icon: XCircle },
  cancelled: { text: "text-muted-foreground", bg: "bg-muted", Icon: Prohibit },
};

export function VariationStatusBadge({
  status,
  size = "md",
}: {
  status: VariationStatus;
  size?: "sm" | "md";
}) {
  const { text, bg, Icon } = STATUS_CONFIG[status];
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-2 py-1 text-sm";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded font-bold ${padding} ${text} ${bg}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {variationStatusLabel(status)}
    </span>
  );
}
