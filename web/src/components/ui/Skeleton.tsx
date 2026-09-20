import type { ReactNode } from "react";

/**
 * Loading placeholders in the shape of the page that is coming, so navigation
 * feels like the page filling in rather than a reload. The branded survey
 * loader is kept for first load and sign-in; route changes use these.
 *
 * Blocks pulse only for people who have not asked for reduced motion
 * (`motion-safe:`); under `prefers-reduced-motion` they are still, flat blocks.
 * Every skeleton page announces one polite "Loading" message and hides its
 * decorative blocks from assistive tech.
 */

/** A single placeholder block. Size it with `className` (e.g. `h-4 w-40`). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-border motion-safe:animate-pulse ${className}`.trim()}
    />
  );
}

/**
 * The page frame for a skeleton route. Use the same `reading` / `working` width
 * as the real page's `PageFrame` so nothing jumps when the content arrives.
 */
export function SkeletonFrame({
  width,
  label = "Loading",
  children,
}: {
  width: "reading" | "working";
  /** Read out once to assistive tech, e.g. "Loading funding requests". */
  label?: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      aria-busy="true"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
    >
      <p role="status" className="sr-only">
        {label}…
      </p>
      <div
        aria-hidden="true"
        className={`flex flex-col gap-6 ${width === "reading" ? "max-w-4xl" : ""}`.trim()}
      >
        {children}
      </div>
    </main>
  );
}

/** Title, subtitle and (optionally) a primary-action button. */
export function SkeletonHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {action && <Skeleton className="h-12 w-40 rounded-lg" />}
    </div>
  );
}

/** A card with a heading line and `lines` text lines. */
export function SkeletonCard({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${className}`.trim()}
    >
      <Skeleton className="h-6 w-48 max-w-full" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** A form-shaped card: a heading, then labelled fields (label line + 48px control). */
export function SkeletonFormCard({ fields = 3 }: { fields?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="h-6 w-40" />
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A list of card rows: two text lines and a badge, like a record list. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>
          <Skeleton className="h-7 w-24 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** A table: header row, then `rows` rows of `cols` cells. */
export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="flex flex-col gap-4 pt-4">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
