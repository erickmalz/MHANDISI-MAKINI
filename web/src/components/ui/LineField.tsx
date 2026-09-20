import type { ReactNode } from "react";

/**
 * A labelled cell for repeating rows (line items, materials). The label stays
 * visible above the control — including after a value is typed — and wraps the
 * control, so it is also the control's accessible name. Placeholders are for
 * an example at most, never the label.
 *
 * For a standalone field with hint and error use `Field` instead.
 */
export function LineField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`.trim()}>
      <span className="text-sm font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}
