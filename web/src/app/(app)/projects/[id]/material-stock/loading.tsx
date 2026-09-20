import { SkeletonFrame, SkeletonHeader, SkeletonTable } from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="working" label={t("materialStock.loading")}>
      <SkeletonHeader action={false} />
      <SkeletonTable rows={6} cols={4} />
    </SkeletonFrame>
  );
}
