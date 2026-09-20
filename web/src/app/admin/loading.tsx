import { SurveySweepLoader } from "@/components/PageLoaders";

export default function AdminLoading() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <SurveySweepLoader />
    </main>
  );
}
