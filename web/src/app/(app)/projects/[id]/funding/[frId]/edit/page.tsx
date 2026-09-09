import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { updateFundingRequestAction } from "@/app/actions/funding";
import { getFundingRequestDraftInput } from "@/lib/data";
import { FundingRequestForm } from "../../../../_components/FundingRequestForm";

export default async function EditFundingRequestPage({
  params,
}: PageProps<"/projects/[id]/funding/[frId]/edit">) {
  const { id, frId } = await params;

  const draft = await getFundingRequestDraftInput(frId);
  if (!draft || draft.projectId !== id) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/funding/${frId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the draft
      </Link>

      <h1 className="mb-2 text-[1.75rem] font-bold text-foreground">
        Edit draft funding request
      </h1>
      <p className="mb-6 max-w-prose text-muted-foreground">
        {draft.kind === "additional"
          ? "Additional request — its own number, added to the stage's requirement."
          : "Adjust the stage's material and labour scope before issuing."}
      </p>

      <FundingRequestForm
        action={updateFundingRequestAction.bind(null, id, frId)}
        fixedStageName={draft.stageName}
        initial={{
          notes: draft.notes,
          paymentInstructions: draft.paymentInstructions,
          lines: draft.lines,
        }}
        submitLabel="Save draft"
        cancelHref={`/projects/${id}/funding/${frId}`}
      />
    </main>
  );
}
