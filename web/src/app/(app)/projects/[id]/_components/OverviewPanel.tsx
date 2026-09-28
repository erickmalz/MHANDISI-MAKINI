import type { ReactNode } from "react";

/**
 * The Overview's working panels (To do, Stages, Breakdown): a plain card with
 * a thin yellow edge along the top, so the three read as one set while the
 * Status card's button stays the page's one yellow action. The card is a size
 * container, so its content can lay out by the panel's own width rather than
 * the viewport's.
 *
 * The yellow edge is an inset shadow on the header, not a thick top border, so
 * it follows the rounded corners instead of tapering into the 1px sides. The
 * `rounded-*-[11px]` corners (here and in the panels' last rows) are the card's
 * 12px radius (`rounded-lg`) less its 1px border, so fills meet the curved edge
 * without a gap.
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
  /** A short line beside the title, in the header. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="@container min-w-0 rounded-lg border border-border bg-card"
    >
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-t-[11px] border-b border-border px-4 pt-3 pb-2 text-card-foreground shadow-[inset_0_4px_0_0_var(--color-accent)] md:px-5">
        <h2 id={headingId} className="text-2xl">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
