import { SkeletonFormCard, SkeletonFrame, SkeletonHeader } from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="reading" label={t("stages.loading.generic")}>
      <SkeletonHeader action={false} />
      <SkeletonFormCard fields={3} />
      <SkeletonFormCard fields={2} />
    </SkeletonFrame>
  );
}
