import {
  Archive,
  CheckCircle,
  HandCoins,
  PaperPlaneTilt,
  PencilSimpleLine,
  Prohibit,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import type { FRStatus } from "@/lib/funding";

const STATUS_CONFIG: Record<
  FRStatus,
  { text: string; bg: string; Icon: typeof Archive }
> = {
  Draft: { text: "text-muted-foreground", bg: "bg-muted", Icon: PencilSimpleLine },
  Issued: { text: "text-health-blue", bg: "bg-health-blue-bg", Icon: PaperPlaneTilt },
  "Partially Deposited": {
    text: "text-health-amber",
    bg: "bg-health-amber-bg",
    Icon: HandCoins,
  },
  Deposited: { text: "text-health-green", bg: "bg-health-green-bg", Icon: CheckCircle },
  Superseded: { text: "text-muted-foreground", bg: "bg-muted", Icon: Stack },
  Cancelled: { text: "text-health-red", bg: "bg-health-red-bg", Icon: Prohibit },
  Closed: { text: "text-muted-foreground", bg: "bg-muted", Icon: Archive },
};

export function FRStatusBadge({
  status,
  size = "md",
}: {
  status: FRStatus;
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
      {status}
    </span>
  );
}
