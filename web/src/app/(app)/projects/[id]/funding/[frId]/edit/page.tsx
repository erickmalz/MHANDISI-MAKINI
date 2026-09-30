import { notFound } from "next/navigation";

import { updateFundingRequestAction } from "@/app/actions/funding";
import { getFundingRequestDraftInput } from "@/lib/data";
import { FundingRequestForm } from "../../../../_components/FundingRequestForm";
import { TaskSourceNote } from "../../../../_components/TaskSourceNote";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("funding.editPageTitle");

export default async function EditFundingRequestPage({
  params,
}: PageProps<"/projects/[id]/funding/[frId]/edit">) {
  const { id, frId } = await params;

  const t = await getT();
  const draft = await getFundingRequestDraftInput(frId);
  if (!draft || draft.projectId !== id) notFound();

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[
          { label: t("funding.pageTitle"), href: `/projects/${id}/funding` },
          { label: t("funding.detailPageTitle"), href: `/projects/${id}/funding/${frId}` },
        ]}
        title={t("funding.edit.title")}
        subtitle={
          draft.kind === "additional"
            ? t("funding.edit.subtitleAdditional")
            : t("funding.edit.subtitleBase")
        }
      />

      {draft.sourceTaskId && (
        <TaskSourceNote projectId={id} taskId={draft.sourceTaskId} kind="funding" />
      )}

      <FundingRequestForm
        action={updateFundingRequestAction.bind(null, id, frId)}
        fixedStageName={draft.stageName}
        initial={{
          notes: draft.notes,
          paymentInstructions: draft.paymentInstructions,
          lines: draft.lines,
        }}
        submitLabel={t("funding.edit.saveDraft")}
        cancelHref={`/projects/${id}/funding/${frId}`}
      />
    </PageFrame>
  );
}
