import { describe, expect, it } from "vitest";

import type {
  FeeInvoiceDocument,
  FundingRequestDocument,
  PurchaseOrderDocument,
} from "@/lib/data/documents";
import { renderDocumentHtml } from "@/lib/documents/templates/render-html";

/**
 * The vocabulary / number-format lock (ticket 10 §2). A pure
 * `renderToStaticMarkup` pass — no browser, no database — so it runs in WSL and
 * CI. It asserts the canonical CONTEXT.md labels and the `FR-` / `FI-` / `PO-`
 * number formats survive into the rendered HTML, and that a `finance.ts` change
 * cannot silently reword the fee-separation sentence.
 */

const profile = {
  businessName: "Juma Site Works",
  phone: "+255 712 000 000",
  email: "juma@example.com",
  logoDataUrl: null,
};

const fundingRequest: FundingRequestDocument = {
  kind: "funding_request",
  projectId: "p1",
  stamp: null,
  profile,
  snapshot: {
    kind: "funding_request",
    displayNumber: "FR-PRJ-2026-001-004 v2",
    issuedOn: "2026-09-06",
    projectName: "Riverside Villas",
    projectCode: "PRJ-2026-001",
    counterpartyName: "A. Client",
    site: "Plot 12, Mikocheni",
    stageName: "Superstructure",
    feeAmount: 420_000,
    supersedes: { displayNumber: "FR-PRJ-2026-001-004", reason: "Revised rebar quantities" },
    sections: [
      {
        title: "Materials",
        subtotal: 12_000_000,
        lines: [
          { label: "Cement 42.5N", qty: "400", unit: "bags", unitCost: 22_000, amount: 8_800_000 },
          { label: "Rebar Y12", qty: "3.2", unit: "tonnes", unitCost: 1_000_000, amount: 3_200_000 },
        ],
      },
    ],
    total: 12_000_000,
    paymentInstructions: "Deposit to CRDB 0150xxxxxxxx.",
  },
};

const feeInvoice: FeeInvoiceDocument = {
  kind: "fee_invoice",
  projectId: "p1",
  stamp: "PAID — 08 Sep 2026",
  profile,
  snapshot: {
    kind: "fee_invoice",
    displayNumber: "FI-PRJ-2026-001-002",
    fundingRequestNumber: "FR-PRJ-2026-001-004 v2",
    issuedOn: "2026-09-06",
    projectName: "Riverside Villas",
    projectCode: "PRJ-2026-001",
    counterpartyName: "A. Client",
    site: "Plot 12, Mikocheni",
    stageName: "Superstructure",
    feeBasis: "percent",
    feePercent: 3.5,
    basisValue: 12_000_000,
    isDelta: false,
    sections: [
      { title: "Supervision fee", subtotal: 420_000, lines: [{ label: "Supervision fee for this stage", amount: 420_000 }] },
    ],
    total: 420_000,
    paymentInstructions: "Fee to M-Pesa 0712xxxxxx.",
  },
};

const purchaseOrder: PurchaseOrderDocument = {
  kind: "purchase_order",
  projectId: "p1",
  stamp: "CANCELLED",
  profile,
  snapshot: {
    kind: "purchase_order",
    displayNumber: "PO-PRJ-2026-001-007",
    issuedOn: "2026-09-06",
    projectName: "Riverside Villas",
    projectCode: "PRJ-2026-001",
    counterpartyName: "Simba Hardware",
    supplierContact: "+255 754 111 222",
    expectedDeliveryOn: "2026-09-20",
    site: "Plot 12, Mikocheni",
    stageName: "Superstructure",
    sections: [
      {
        title: "Material lines",
        subtotal: 1_500_000,
        lines: [{ label: "Timber 2x4", qty: "100", unit: "pcs", unitCost: 15_000, amount: 1_500_000 }],
      },
    ],
    total: 1_500_000,
    paymentInstructions: "50% on order, 50% on delivery.",
  },
};

describe("document templates — vocabulary + number formats", () => {
  it("Funding Request keeps its number format and fee-separation wording", async () => {
    const html = await renderDocumentHtml(fundingRequest);
    expect(html).toContain("FR-PRJ-2026-001-004 v2");
    expect(html).toContain("Funding request");
    expect(html).toContain("TZS 12,000,000");
    expect(html).toContain("billed separately through the fee invoice");
    expect(html).toContain("not drawn from your project deposits");
    expect(html).toContain("Supersedes FR-PRJ-2026-001-004");
    expect(html).toContain("06 Sep 2026");
  });

  it("Fee Invoice states it is billed separately from project funds", async () => {
    const html = await renderDocumentHtml(feeInvoice);
    expect(html).toContain("FI-PRJ-2026-001-002");
    expect(html).toContain("Fee invoice");
    expect(html).toContain(
      "This fee is billed separately from the project funds in funding request FR-PRJ-2026-001-004 v2",
    );
    expect(html).toContain("It is not paid from your project deposits");
    expect(html).toContain("3.5% of stage value TZS 12,000,000");
    // The PAID stamp doubles as the receipt.
    expect(html).toContain("PAID — 08 Sep 2026");
    expect(html).toContain("stamp--paid");
  });

  it("Purchase Order shows the order as issued, with a CANCELLED stamp", async () => {
    const html = await renderDocumentHtml(purchaseOrder);
    expect(html).toContain("PO-PRJ-2026-001-007");
    expect(html).toContain("Purchase order");
    expect(html).toContain("Deliver to");
    expect(html).toContain("Order total");
    expect(html).toContain("CANCELLED");
    // Never a live tracker.
    expect(html).not.toContain("Commitment State");
    expect(html).not.toContain("Delivered (accepted)");
  });

  it("screenshot variant swaps in the in-flow footer", async () => {
    const pdfHtml = await renderDocumentHtml(fundingRequest);
    const jpgHtml = await renderDocumentHtml(fundingRequest, { screenshot: true });
    expect(pdfHtml).toContain('<body class="">');
    expect(jpgHtml).toContain('<body class="screenshot">');
  });
});
