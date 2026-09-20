import { SkeletonFrame, SkeletonHeader, SkeletonRows } from "@/components/ui/Skeleton";
import { getT } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getT();
  return (
    <SkeletonFrame width="working" label={t("subcontractors.list.loading")}>
      <SkeletonHeader />
      <SkeletonRows rows={5} />
    </SkeletonFrame>
  );
}
