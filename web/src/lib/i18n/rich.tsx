import { Fragment, type ReactNode } from "react";

import type { Translator } from "./translate";
import type { MessageKey } from "./types";

// A character that never appears in real text, used to find the placeholders again.
const MARKER = String.fromCharCode(1);

/**
 * A message whose `{placeholders}` are elements — a sentence that contains a
 * link or bold word. Pure, so it works in Server and Client Components:
 * `richMessage(t, "auth.signUp.accept", { terms: <Link/>, privacy: <Link/> })`.
 * The translator decides the word order; we only swap the placeholders.
 */
export function richMessage(
  t: Translator,
  key: MessageKey,
  parts: Record<string, ReactNode>,
): ReactNode {
  const marked = t(
    key,
    Object.fromEntries(Object.keys(parts).map((name) => [name, `${MARKER}${name}${MARKER}`])),
  );
  return marked
    .split(MARKER)
    .map((piece, index) =>
      index % 2 === 1 ? <Fragment key={index}>{parts[piece]}</Fragment> : piece,
    );
}
