import type { ReactNode } from "react";

/**
 * The Overview's working panels (To do, Stages, Breakdown): a yellow-edged
 * card under a yellow glass title bar. The bar's text is always charcoal on
 * yellow, in both themes. The card is a size container, so its content can
 * lay out by the panel's own width rather than the viewport's.
 */
export function OverviewPanel({
  id,
  headingId,
  title,
  aside,
  children,
}: {
  id?: string;
  headingId: string;
  title: string;
  /** A short line beside the title, on the bar. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="@container min-w-0 rounded-lg border-2 border-accent bg-card"
    >
      <div className="mm-glass-bar flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-t-[10px] px-4 py-2 text-on-accent md:px-5">
        <h2 id={headingId} className="text-2xl">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
