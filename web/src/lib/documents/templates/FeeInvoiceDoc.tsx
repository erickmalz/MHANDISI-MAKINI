import type { FeeInvoiceDocument } from "@/lib/data/documents";
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
 * The client-facing Fee Invoice (ticket 10 §7). The supervisor's fee for one
 * stage, always billed separately from the project funds — the document says so
 * explicitly. Doubles as the receipt once `PAID` is stamped.
 */
export function FeeInvoiceDoc({ doc }: { doc: FeeInvoiceDocument }) {
  const { snapshot, profile, stamp } = doc;

  const basisText =
    snapshot.feeBasis === "percent" && snapshot.feePercent != null
      ? `${snapshot.feePercent}% of stage value${
          snapshot.basisValue != null
            ? ` ${formatTZS(snapshot.basisValue)}`
            : ""
        }`
      : "Fixed supervision fee for this stage";

  const meta: MetaItem[] = [
    { label: "Project", value: `${snapshot.projectName} (${snapshot.projectCode})` },
    { label: "Client", value: snapshot.counterpartyName },
    { label: "Stage", value: snapshot.stageName },
    { label: "Funding request", value: snapshot.fundingRequestNumber },
    { label: "Fee basis", value: basisText },
    { label: "Issued", value: isoToDisplay(snapshot.issuedOn) },
  ];

  return (
    <Shell
      profile={profile}
      title="Fee invoice"
      number={snapshot.displayNumber}
      stamp={stamp}
      meta={meta}
    >
      {snapshot.isDelta && snapshot.parentNumber ? (
        <Callout title="Follow-up invoice">
          Follow-up to {snapshot.parentNumber} for the revised fee on{" "}
          {snapshot.fundingRequestNumber} — delta only.
        </Callout>
      ) : null}

      {snapshot.correction ? (
        <Callout title="Corrected invoice">
          Amount corrected on {isoToDisplay(snapshot.correction.correctedOn)} from{" "}
          {formatTZS(snapshot.correction.originalAmount)}:{" "}
          {snapshot.correction.reason}
        </Callout>
      ) : null}

      {snapshot.sections.map((section) => (
        <SectionTable
          key={section.title}
          section={section}
          showUnitColumns={false}
        />
      ))}

      <GrandTotal label="Fee due" amount={snapshot.total} />

      <Callout title="Billed separately from project funds" variant="fee">
        This fee is billed separately from the project funds in funding request{" "}
        {snapshot.fundingRequestNumber}. It is not paid from your project
        deposits.
      </Callout>

      {snapshot.paymentInstructions ? (
        <TextBlock
          title="Fee payment instructions"
          body={snapshot.paymentInstructions}
        />
      ) : null}
    </Shell>
  );
}
