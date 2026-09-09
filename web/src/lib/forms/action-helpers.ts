import type { ZodError } from "zod";

/**
 * The shape every structure Server Action returns to `useActionState`
 * (Slice 2.4). `fieldErrors` is keyed by the form control `name`.
 */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** First message per top-level field from a Zod parse failure. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}
