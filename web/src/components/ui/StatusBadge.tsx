import type { ComponentType, ReactNode } from "react";

/**
 * The one status badge. A status is always words, with an icon where it helps —
 * never colour alone. Tones map to the brand's status colours and carry meaning
 * (info = in progress, success = complete, warning = needs attention,
 * danger = failed or cancelled, neutral = inactive or not started).
 * Both sizes use 14px type; `sm` is only shorter.
 */
const TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-health-blue-bg text-health-blue",
  success: "bg-health-green-bg text-health-green",
  warning: "bg-health-amber-bg text-health-amber",
  danger: "bg-health-red-bg text-health-red",
} as const;

export type StatusTone = keyof typeof TONES;

export type BadgeIcon = ComponentType<{ size?: number; "aria-hidden"?: "true" }>;

export function StatusBadge({
  tone,
  icon: Icon,
  size = "md",
  children,
}: {
  tone: StatusTone;
  icon?: BadgeIcon;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded px-2 text-sm font-bold ${
        size === "sm" ? "py-0.5" : "py-1"
      } ${TONES[tone]}`}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} aria-hidden="true" />}
      {children}
    </span>
  );
}
