import type { ReactNode } from "react";

/**
 * The one page frame. Every screen's content sits in the same 6xl container,
 * so line length and margins stay consistent from page to page. `width`
 * decides how much of that container the content uses:
 *
 * - `reading` — forms and single records, capped at 4xl (paragraphs still cap
 *   themselves at a comfortable line length) and left-aligned, never centred
 *   narrower inside the frame.
 * - `working` — lists, tables and dashboards, the full container. Every
 *   top-level tab uses it, so the width does not jump when switching tabs.
 *
 * `id="main"` is the target of the skip link in `AppChrome`.
 */
export function PageFrame({
  width = "reading",
  children,
}: {
  width?: "reading" | "working";
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className={width === "reading" ? "max-w-4xl" : undefined}>
        {children}
      </div>
    </main>
  );
}
