import {
  Skeleton,
  SkeletonCard,
  SkeletonFrame,
  SkeletonHeader,
} from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";

/**
 * Covers every page inside a project. It is shaped like the Overview (status
 * band, position card, two cards) because that is the page opened most often.
 */
export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="working" label={t("stages.loading.project")}>
      <SkeletonHeader />
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-7 w-28 shrink-0" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-4 h-10 w-64 max-w-full" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-36 max-w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-6 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    </SkeletonFrame>
  );
}
