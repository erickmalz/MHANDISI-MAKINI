import type { PurchaseOrderDocument } from "@/lib/data/documents";

import {
  GrandTotal,
  isoToDisplay,
  SectionTable,
  Shell,
  TextBlock,
  type MetaItem,
} from "./parts";

/**
 * The supplier-facing Purchase Order (guidelines §22, ticket 10 §7). The order
 * as issued — deliberately *not* a tracker: no Commitment State, no delivered
 * or paid progress.
 */
export function PurchaseOrderDoc({ doc }: { doc: PurchaseOrderDocument }) {
  const { snapshot, profile, stamp } = doc;

  const meta: MetaItem[] = [
    { label: "Project", value: `${snapshot.projectName} (${snapshot.projectCode})` },
    { label: "Supplier", value: snapshot.counterpartyName },
    ...(snapshot.supplierContact
      ? [{ label: "Supplier contact", value: snapshot.supplierContact }]
      : []),
    { label: "Deliver to", value: snapshot.site },
    { label: "Order date", value: isoToDisplay(snapshot.issuedOn) },
    ...(snapshot.expectedDeliveryOn
      ? [
          {
            label: "Expected delivery",
            value: isoToDisplay(snapshot.expectedDeliveryOn),
          },
        ]
      : []),
  ];

  return (
    <Shell
      profile={profile}
      title="Purchase order"
      number={snapshot.displayNumber}
      stamp={stamp}
      meta={meta}
    >
      {snapshot.sections.map((section) => (
        <SectionTable key={section.title} section={section} />
      ))}

      <GrandTotal label="Order total" amount={snapshot.total} />

      {snapshot.paymentInstructions ? (
        <TextBlock title="Payment terms" body={snapshot.paymentInstructions} />
      ) : null}
      {snapshot.notes ? <TextBlock title="Notes" body={snapshot.notes} /> : null}
    </Shell>
  );
}
