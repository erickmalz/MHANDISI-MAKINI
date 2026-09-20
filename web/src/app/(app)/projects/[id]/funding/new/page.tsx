import { notFound } from "next/navigation";

import { createFundingRequestAction } from "@/app/actions/funding";
import { getProjectOverview, getVariation } from "@/lib/data";
import { FundingRequestForm } from "../../../_components/FundingRequestForm";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("funding.newPageTitle");

export default async function NewFundingRequestPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/funding/new">) {
  const { id } = await params;
  const { kind, variationId, stageId } = await searchParams;
  const project = await getProjectOverview(id);
  if (!project) notFound();
  const t = await getT();

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
      <PageFrame width="reading">
        <PageHeader
          crumbs={[{ label: t("funding.pageTitle"), href: `/projects/${id}/funding` }]}
          title={t("funding.new.title")}
        />
        <p className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-sm text-muted-foreground">
          {t("funding.new.noFundableStage")}
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("funding.pageTitle"), href: `/projects/${id}/funding` }]}
        title={isAdditional ? t("funding.new.additionalTitle") : t("funding.new.title")}
        subtitle={
          isAdditional
            ? t("funding.new.subtitleAdditional")
            : t("funding.new.subtitleBase")
        }
      />

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
          (typeof stageId === "string" ? stageId : undefined) ??
          linkedVariations[0]?.stageId ??
          project.currentStageId ??
          undefined
        }
        submitLabel={t("funding.new.saveDraft")}
        cancelHref={`/projects/${id}/funding`}
        variationLinks={linkedVariations.map((v) => ({
          id: v.id,
          displayNumber: v.displayNumber,
          description: v.description,
        }))}
      />
    </PageFrame>
  );
}
