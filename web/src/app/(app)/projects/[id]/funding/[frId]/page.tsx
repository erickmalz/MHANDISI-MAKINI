import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import {
  deleteFundingRequestDraftAction,
  issueFundingRequestAction,
  recordDepositAction,
  supersedeFundingRequestAction,
  voidDepositAction,
} from "@/app/actions/funding";
import { getFundingRequest } from "@/lib/data";
import { FundingRequestDetail } from "./_components/FundingRequestDetail";

export default async function FundingRequestPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/funding/[frId]">) {
  const { id, frId } = await params;
  const { issue_error } = await searchParams;

  const fr = await getFundingRequest(frId);
  if (!fr || fr.projectId !== id) notFound();

  const voidActions = Object.fromEntries(
    fr.deposits.map((d) => [
      d.id,
      voidDepositAction.bind(null, id, fr.id, d.id),
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/funding`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Funding requests
      </Link>

      <FundingRequestDetail
        fr={fr}
        projectId={id}
        issueAction={issueFundingRequestAction.bind(null, id, fr.id)}
        issueError={typeof issue_error === "string" ? issue_error : undefined}
        supersedeAction={supersedeFundingRequestAction.bind(null, id, fr.id)}
        depositAction={recordDepositAction.bind(null, id, fr.id)}
        discardAction={deleteFundingRequestDraftAction.bind(null, id, fr.id)}
        editHref={`/projects/${id}/funding/${fr.id}/edit`}
        voidActions={voidActions}
      />
    </main>
  );
}
