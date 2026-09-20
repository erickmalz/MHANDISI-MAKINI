"use client";

import { useEffect } from "react";

/** How long after a submit a newly invalid field still counts as its result. */
const RESULT_WINDOW_MS = 10_000;

/**
 * After a failed submit, moves keyboard focus to the first field the form
 * marked `aria-invalid` — so a keyboard or screen-reader user lands on the
 * problem instead of having to hunt for it (WCAG 3.3.1). Every form here gets
 * `aria-invalid` from `Field`, whether the error came from client checks or a
 * Server Action, so one observer covers them all.
 *
 * Only reacts inside the form that was just submitted, and only once per
 * submit, so it never steals focus while someone is typing elsewhere.
 * Render once, in the root layout.
 */
export function FocusFirstInvalid() {
  useEffect(() => {
    let form: HTMLFormElement | null = null;
    let submittedAt = 0;

    const onSubmit = (event: Event) => {
      form = event.target instanceof HTMLFormElement ? event.target : null;
      submittedAt = Date.now();
    };

    const focusFirstInvalid = () => {
      if (!form || Date.now() - submittedAt > RESULT_WINDOW_MS) return;
      const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (!invalid) return;
      form = null; // once per submit
      invalid.focus();
    };

    // Capture phase: runs before React's own submit handling.
    document.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(focusFirstInvalid);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });

    return () => {
      document.removeEventListener("submit", onSubmit, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
