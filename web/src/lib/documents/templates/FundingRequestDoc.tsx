import type { FundingRequestDocument } from "@/lib/data/documents";
import { formatTZS } from "@/lib/finance";

import {
  Callout,
  GrandTotal,
  isoToDisplay,
  SectionTable,
  Shell,
  TextBlock,
  type MetaItem,
} from "./parts";

/**
 * The client-facing Funding Request (guidelines §18, ticket 10 §7). Shows the
 * material / labour / other breakdown, the supervision fee as a transparency
 * line billed separately, and the total requested as the deposit target.
 */
export function FundingRequestDoc({ doc }: { doc: FundingRequestDocument }) {
  const { snapshot, profile, stamp } = doc;

  const meta: MetaItem[] = [
    { label: "Project", value: `${snapshot.projectName} (${snapshot.projectCode})` },
    { label: "Client", value: snapshot.counterpartyName },
    { label: "Site", value: snapshot.site },
    { label: "Stage", value: snapshot.stageName },
    { label: "Issued", value: isoToDisplay(snapshot.issuedOn) },
  ];

  return (
    <Shell
      profile={profile}
      title="Funding request"
      number={snapshot.displayNumber}
      stamp={stamp}
      meta={meta}
    >
      {snapshot.supersedes ? (
        <Callout title="Supersedes an earlier version">
          Supersedes {snapshot.supersedes.displayNumber} — reason:{" "}
          {snapshot.supersedes.reason}
        </Callout>
      ) : null}

      {snapshot.sections.map((section) => (
        <SectionTable key={section.title} section={section} />
      ))}

      <Callout title="Supervision fee" variant="fee">
        {formatTZS(snapshot.feeAmount)} — billed separately through the fee
        invoice. It is not drawn from your project deposits.
      </Callout>

      <GrandTotal label="Total requested (deposit target)" amount={snapshot.total} />

      {snapshot.paymentInstructions ? (
        <TextBlock title="Payment instructions" body={snapshot.paymentInstructions} />
      ) : null}
      {snapshot.notes ? <TextBlock title="Notes" body={snapshot.notes} /> : null}
    </Shell>
  );
}
