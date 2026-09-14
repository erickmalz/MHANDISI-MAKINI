import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { createFundingRequestAction } from "@/app/actions/funding";
import { getProjectOverview, getVariation } from "@/lib/data";
import { FundingRequestForm } from "../../../_components/FundingRequestForm";

export default async function NewFundingRequestPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/funding/new">) {
  const { id } = await params;
  const { kind, variationId } = await searchParams;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const isAdditional = kind === "additional";

  // Opened from an Approved Variation's "Raise Additional Funding Request"
  // action (ticket 01 §4) — pre-links it, purely informationally, once saved.
  const variationIds = (Array.isArray(variationId) ? variationId : variationId ? [variationId] : []);
  const linkedVariations = (
    await Promise.all(variationIds.map((vid) => getVariation(vid)))
  ).filter((v): v is NonNullable<typeof v> => v != null && v.status === "approved");

  const fundableStages = project.stages.filter(
    (s) => s.status !== "Completed" && s.status !== "Cancelled",
  );

  if (fundableStages.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <BackLink id={id} name={project.name} />
        <h1 className="mb-4 text-[1.75rem] font-bold text-foreground">
          Create funding request
        </h1>
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          This project has no stage that can be funded yet. Add a stage first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <BackLink id={id} name={project.name} />

      <h1 className="mb-2 text-[1.75rem] font-bold text-foreground">
        {isAdditional ? "Additional funding request" : "Create funding request"}
      </h1>
      <p className="mb-6 max-w-prose text-muted-foreground">
        {isAdditional
          ? "A separate request for approved scope growth mid-stage. It gets its own number; the original request stays live and the stage's requirement is their sum."
          : "Enter the stage's material and labour scope. The supervision fee is added from the stage's fee basis when you issue, and billed through its own Fee Invoice."}
      </p>

      <FundingRequestForm
        action={createFundingRequestAction.bind(
          null,
          id,
          isAdditional ? "additional" : "base",
        )}
        stages={fundableStages.map((s) => ({
          id: s.id,
          name: s.name,
          seq: s.seq,
          status: s.status,
        }))}
        defaultStageId={
          linkedVariations[0]?.stageId ?? project.currentStageId ?? undefined
        }
        submitLabel="Save draft"
        cancelHref={`/projects/${id}/funding`}
        variationLinks={linkedVariations.map((v) => ({
          id: v.id,
          displayNumber: v.displayNumber,
          description: v.description,
        }))}
      />
    </main>
  );
}

function BackLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/projects/${id}/funding`}
      className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {name} — funding
    </Link>
  );
}
