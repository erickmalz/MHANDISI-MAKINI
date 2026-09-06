import type { ComponentProps } from "react";

/**
 * Card: white surface, 1px subtle border, 8px radius, 16px padding.
 * No shadow — the border carries the separation. Group related information
 * inside one card; separate cards by 24px.
 */
export function Card({ className = "", ...rest }: ComponentProps<"section">) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-4 ${className}`.trim()}
      {...rest}
    />
  );
}
