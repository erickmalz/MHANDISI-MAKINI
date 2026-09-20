import { Skeleton, SkeletonCard, SkeletonFrame, SkeletonHeader } from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";

/** Task cards: description, subcontractor, progress bar. */
export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="working" label={t("stages.loading.stage")}>
      <SkeletonHeader />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <SkeletonCard lines={3} />
    </SkeletonFrame>
  );
}
