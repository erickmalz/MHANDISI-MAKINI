import { notFound } from "next/navigation";

import {
  deleteFundingRequestDraftAction,
  issueFundingRequestAction,
  recordDepositAction,
  supersedeFundingRequestAction,
  voidDepositAction,
} from "@/app/actions/funding";
import { getFundingRequest } from "@/lib/data";
import { FundingRequestDetail } from "./_components/FundingRequestDetail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageFrame } from "@/components/ui/PageFrame";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("funding.detailPageTitle");

export default async function FundingRequestPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/funding/[frId]">) {
  const { id, frId } = await params;
  const { issue_error } = await searchParams;

  const t = await getT();
  const fr = await getFundingRequest(frId);
  if (!fr || fr.projectId !== id) notFound();

  const voidActions = Object.fromEntries(
    fr.deposits.map((d) => [
      d.id,
      voidDepositAction.bind(null, id, fr.id, d.id),
    ]),
  );

  return (
    <PageFrame width="working">
      <Breadcrumbs crumbs={[{ label: t("funding.pageTitle"), href: `/projects/${id}/funding` }]} />

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
    </PageFrame>
  );
}
