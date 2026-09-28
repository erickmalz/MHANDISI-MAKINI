import {
  Skeleton,
  SkeletonCard,
  SkeletonFrame,
  SkeletonHeader,
} from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";
import { DARK_RIM } from "./_components/StatusCard";

/**
 * Covers every page inside a project. It is shaped like the Overview's working
 * desk because that is the page opened most often: at `xl` the three
 * yellow-edged panels (To do, Stages, Breakdown) down the main column and,
 * in a 20rem column beside them, the charcoal status card over the position
 * and supervisor-fee cards. Below `xl` it is one column opening with the
 * status card, the two small cards side by side from `md` — the same grid as
 * the page, so nothing jumps when the content arrives.
 */
export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="working" label={t("stages.loading.project")}>
      <SkeletonHeader action={false} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:items-start">
        <div
          className={`flex flex-col gap-4 rounded-2xl bg-surface-inverse p-6 ${DARK_RIM} xl:col-start-2 xl:row-start-1`}
        >
          <div className="flex items-center justify-between gap-2">
            <Tone className="h-7 w-28 bg-on-inverse/20" />
            <Tone className="h-4 w-20 bg-on-inverse/20" />
          </div>
          <Tone className="h-6 w-full bg-on-inverse/20" />
          <Tone className="h-6 w-2/3 bg-on-inverse/20" />
          <div className="grid grid-cols-2 gap-3 border-t border-on-inverse/20 pt-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Tone className="h-4 w-20 bg-on-inverse/20" />
                <Tone className="h-5 w-28 max-w-full bg-on-inverse/20" />
              </div>
            ))}
          </div>
          <Tone className="h-12 w-full rounded-lg bg-on-inverse/20" />
        </div>

        <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <SkeletonPanel rows={2} />
          <SkeletonPanel rows={3} />
          <SkeletonPanel rows={3} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start xl:col-start-2 xl:row-start-2 xl:grid-cols-1">
          <SkeletonCard lines={4} />
          <div className="rounded-lg border border-dashed border-border-strong bg-card p-4">
            <Skeleton className="h-6 w-48 max-w-full" />
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonFrame>
  );
}

/** An Overview working panel: the yellow-edged header, then `rows` list rows. */
function SkeletonPanel({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex min-h-14 items-center rounded-t-[11px] border-b border-border px-4 pt-1 shadow-[inset_0_4px_0_0_var(--color-accent)] md:px-5">
        <Skeleton className="h-6 w-36" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0 md:px-5"
        >
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="ml-auto h-4 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * A placeholder block on the charcoal status card, where the default border-grey block would glare. It pulses the
 * same way, only for people who have not asked for reduced motion.
 */
function Tone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded motion-safe:animate-pulse ${className}`} />;
}
