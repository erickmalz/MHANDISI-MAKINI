import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Input wrapper for the MHANDISI MAKINI system.
 *
 * Structure, top to bottom: label → control → hint → error.
 * The label is always persistent and visible — a placeholder is never the
 * label. Required fields are marked in the label, not discovered on submit.
 * Errors sit next to the field and say how to recover.
 *
 * Pass a single form control as the child; the label, `id`, `aria-invalid`
 * and `aria-describedby` are wired for you.
 */

/** Shared control styling — 48px min height, visible border at rest. */
export const controlClass =
  "min-h-12 w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-base text-foreground";

export function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactElement<Record<string, unknown>>;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const injected: Record<string, unknown> = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  const control = isValidElement(children)
    ? cloneElement(Children.only(children), injected)
    : children;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
        {required && (
          <span className="font-normal text-muted-foreground"> (required)</span>
        )}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
