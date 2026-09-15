import type { ProjectCloseoutReportDocument } from "@/lib/data/documents";
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
 * The Project Closeout Report (guidelines §37, Phase 4 ticket 04) — a
 * full reconciliation frozen the moment `completeProject` runs. Reuses the
 * shared `Shell`/`SectionTable`/`GrandTotal`/`Callout` building blocks
 * (ticket 10 §2) rather than any bespoke layout: the four itemised, summed
 * groups (Approved Variations, Supplier Balances, Subcontractor Balances,
 * Outstanding Documents) render through `snapshot.sections` exactly like the
 * other three documents' line items; `GrandTotal` carries the Final Project
 * Variance. The remaining figures are single derived totals, not itemised
 * lists, so they render through the small `Figures` grid below instead of a
 * priced table.
 */
export function ProjectCloseoutReportDoc({
  doc,
}: {
  doc: ProjectCloseoutReportDocument;
}) {
  const { snapshot, profile, stamp } = doc;

  const meta: MetaItem[] = [
    { label: "Project", value: `${snapshot.projectName} (${snapshot.projectCode})` },
    { label: "Client", value: snapshot.counterpartyName },
    { label: "Site", value: snapshot.site },
    { label: "Stages", value: snapshot.stageName },
    { label: "Completed", value: isoToDisplay(snapshot.issuedOn) },
  ];

  return (
    <Shell
      profile={profile}
      title="Project closeout report"
      number={snapshot.displayNumber}
      stamp={stamp}
      meta={meta}
    >
      <Callout title="Full project reconciliation">
        Assembled from every stage&rsquo;s own figures at the moment this
        project was marked Completed. As with every other issued document,
        this report reads the same today as it did on that date, even if a
        later correction touches a stage&rsquo;s live figures.
      </Callout>

      <Figures
        title="Client Funds"
        items={[
          { label: "Total client funding (deposits received)", amount: snapshot.totalClientFunding },
          { label: "Remaining client float", amount: snapshot.remainingClientFloat },
        ]}
      />

      <Figures
        title="Materials"
        items={[
          { label: "Total material commitments (ordered, open + paid)", amount: snapshot.totalMaterialCommitments },
          { label: "Total actual material cost (paid)", amount: snapshot.totalActualMaterialCost },
        ]}
      />

      <Figures
        title="Labour"
        items={[
          { label: "Total labour agreements", amount: snapshot.totalLabourAgreements },
          { label: "Total labour paid", amount: snapshot.totalLabourPaid },
        ]}
      />

      <Figures
        title="Supervisor Fee"
        items={[
          { label: "Total fees invoiced", amount: snapshot.totalFeesInvoiced },
          { label: "Total fees received", amount: snapshot.totalFeesReceived },
        ]}
      />

      {snapshot.sections.map((section) =>
        section.lines.length > 0 ? (
          <SectionTable key={section.title} section={section} showUnitColumns={false} />
        ) : (
          <Callout key={section.title} title={section.title}>
            None.
          </Callout>
        ),
      )}

      <GrandTotal label="Final project variance" amount={snapshot.total} />

      {snapshot.notes ? <TextBlock title="Notes" body={snapshot.notes} /> : null}
    </Shell>
  );
}

function Figures({
  title,
  items,
}: {
  title: string;
  items: { label: string; amount: number }[];
}) {
  return (
    <section className="section">
      <h2 className="section__title">{title}</h2>
      <dl className="meta">
        {items.map((item) => (
          <div className="meta__item" key={item.label}>
            <dt className="meta__label">{item.label}</dt>
            <dd className="meta__value">{formatTZS(item.amount)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
