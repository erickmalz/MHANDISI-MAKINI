import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateSiteDiaryEntryAction } from "@/app/actions/site-diary";
import { getSiteDiaryEntry, getStageDetail } from "@/lib/data";
import { SiteDiaryEntryForm } from "../../../../../../_components/SiteDiaryEntryForm";

export default async function EditSiteDiaryEntryPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/diary/[entryId]/edit">) {
  const { id, stageId, entryId } = await params;

  const [stage, entry] = await Promise.all([
    getStageDetail(stageId),
    getSiteDiaryEntry(entryId),
  ]);
  if (!stage || stage.projectId !== id) notFound();
  if (!entry || entry.stageId !== stageId) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.name}
      </Link>

      <h1 className="mb-1 text-[1.75rem] font-bold text-foreground">Edit diary entry</h1>
      <p className="mb-6 text-muted-foreground">{stage.name}</p>

      <SiteDiaryEntryForm
        action={updateSiteDiaryEntryAction.bind(null, id, stageId, entryId)}
        initial={{
          entryDate: entry.entryDate,
          weather: entry.weather ?? undefined,
          workersOnSite: entry.workersOnSite ?? undefined,
          activities: entry.activities ?? undefined,
          materialsUsed: entry.materialsUsed ?? undefined,
          equipmentUsed: entry.equipmentUsed ?? undefined,
          delays: entry.delays ?? undefined,
          issues: entry.issues ?? undefined,
          instructions: entry.instructions ?? undefined,
          visitors: entry.visitors ?? undefined,
          notes: entry.notes ?? undefined,
        }}
        submitLabel="Save changes"
        cancelHref={`/projects/${id}/stages/${stageId}`}
      />
    </main>
  );
}
