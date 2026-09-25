import type { ComponentProps } from "react";

/**
 * Card: white surface, 1px subtle border, 12px radius, 16px padding on
 * mobile scaling to 24px on desktop (md:). No shadow — the border carries
 * the separation. Group related information inside one card; separate
 * cards by 24px.
 */
export function Card({ className = "", ...rest }: ComponentProps<"section">) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-4 md:p-6 ${className}`.trim()}
      {...rest}
    />
  );
}
