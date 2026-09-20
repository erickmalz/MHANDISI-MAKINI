import {
  SkeletonFrame,
  SkeletonHeader,
  SkeletonTable,
} from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <SkeletonFrame width="working" label="Loading accounts">
      <SkeletonHeader action={false} />
      <SkeletonTable rows={6} cols={4} />
    </SkeletonFrame>
  );
}
