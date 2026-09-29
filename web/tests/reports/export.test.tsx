import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProcurementReport } from "@/lib/data/reports";
import type { SupplierStatement } from "@/lib/data/statements";
import { ReportExportDoc } from "@/lib/documents/report-export/ReportExportDoc";
import type { ReportExportDocument } from "@/lib/documents/report-export/load";
import { en } from "@/lib/i18n/messages/en";
import { sw } from "@/lib/i18n/messages/sw";
import { createT } from "@/lib/i18n/translate";
import { CSV_BOM, reportToCsv, tableToCsv } from "@/lib/reports/csv";
import { eatIsoDate, reportExportFilename } from "@/lib/reports/export-filename";
import { buildExportModel, type ModelContext } from "@/lib/reports/export-table";
import type { ReportFilterState } from "@/lib/reports/filters";

const t = createT("en", en);

function state(overrides: Partial<ReportFilterState> = {}): ReportFilterState {
  return {
    kind: "procurement",
    filters: {},
    options: {},
    active: [],
    dateRangeActive: false,
    finerFilterActive: false,
    ...overrides,
  };
}

const ctx = (filterState = state()): ModelContext => ({ t, locale: "en", filterState });

const procurement: ProcurementReport = {
  projectId: "p1",
  projectCode: "PRJ-2026-001",
  projectName: "A Residence",
  required: 5_000_000,
  rows: [
    {
      purchaseOrderId: "po1",
      displayNumber: "PO-PRJ-2026-001-003",
      status: "Partially Delivered",
      stageId: "st1",
      stageName: "Walling",
      supplierId: "sup1",
      supplierName: 'Depot "Best", Ltd',
      orderedOn: "2026-09-10",
      ordered: 3_250_000,
      delivered: 1_600_000,
      paid: 1_200_000,
      outstanding: 2_050_000,
    },
    {
      purchaseOrderId: "po2",
      displayNumber: null,
      status: "Planned",
      stageId: "st2",
      stageName: "=HYPERLINK(\"x\")",
      supplierId: "sup2",
      supplierName: "Mawe",
      orderedOn: null,
      ordered: 0,
      delivered: 0,
      paid: 0,
      outstanding: 0,
    },
  ],
  totals: { ordered: 3_250_000, delivered: 1_600_000, paid: 1_200_000, outstanding: 2_050_000 },
};

describe("CSV Report Export", () => {
  const csv = reportToCsv({ kind: "procurement", report: procurement }, ctx());
  const lines = csv.slice(CSV_BOM.length).split("\r\n");

  it("starts with a UTF-8 BOM and uses CRLF line ends", () => {
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("writes one header row, the rows, then the Total row — no metadata lines", () => {
    expect(lines[0]).toBe(
      "Order,Status,Stage,Supplier,Ordered,Delivered,Paid,Outstanding",
    );
    expect(lines[3]).toBe("Total,,,,3250000,1600000,1200000,2050000");
    expect(lines.filter(Boolean)).toHaveLength(4);
  });

  it("keeps amounts as plain whole shillings and quotes per RFC 4180", () => {
    expect(lines[1]).toBe(
      'PO-PRJ-2026-001-003,Partially delivered,Walling,"Depot ""Best"", Ltd",3250000,1600000,1200000,2050000',
    );
  });

  it("neutralises a text cell that a spreadsheet would run as a formula", () => {
    expect(lines[2]).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it("labels the totals 'Total (filtered)' while a filter is on", () => {
    const filtered = reportToCsv(
      { kind: "procurement", report: procurement },
      ctx(state({ active: [{ dimension: "stage", value: "s1", label: "Walling" }] })),
    );
    expect(filtered).toContain("\r\nTotal (filtered),");
  });

  it("writes headers in the viewer's language", () => {
    const swCtx: ModelContext = { ...ctx(), t: createT("sw", sw, en), locale: "sw" };
    const swCsv = tableToCsv(buildExportModel({ kind: "procurement", report: procurement }, swCtx).tables[0]);
    expect(swCsv.split("\r\n")[0]).not.toBe(lines[0]);
  });

  it("never quotes or rewrites a negative number", () => {
    const out = tableToCsv({ title: "x", columns: [{ label: "V", money: true }], rows: [[-1500]], total: null });
    expect(out).toBe(`${CSV_BOM}V\r\n-1500\r\n`);
  });
});

describe("statement ledger CSV", () => {
  const statement: SupplierStatement = {
    supplierId: "s1",
    name: "Depot Ltd",
    orders: [
      {
        purchaseOrderId: "po1",
        projectId: "p1",
        displayNumber: "PO-1",
        status: "ordered",
        projectName: "A Residence",
        stageName: "Walling",
        orderedTotal: 1_000,
        createdAt: "2026-09-10T08:00:00Z",
        orderedOn: "2026-09-10",
      },
      {
        purchaseOrderId: "po2",
        projectId: "p1",
        displayNumber: "PO-2",
        status: "cancelled",
        projectName: "A Residence",
        stageName: "Roofing",
        orderedTotal: 500,
        createdAt: "2026-09-01T08:00:00Z",
        orderedOn: "2026-09-01",
      },
    ],
    payments: [
      {
        id: "pay1",
        purchaseOrderId: "po1",
        projectId: "p1",
        displayNumber: "PO-1",
        projectName: "A Residence",
        amount: 400,
        paidOn: "2026-09-12",
        orderStatus: "ordered",
        paidDate: "2026-09-12",
        method: "cash",
        reference: "RCPT 9",
      },
    ],
    outstandingBalance: 600,
  };
  const lines = reportToCsv({ kind: "supplier-statement", statement }, ctx())
    .slice(CSV_BOM.length)
    .split("\r\n");

  it("is one date-sorted Charged / Paid ledger ending in Total and Outstanding", () => {
    expect(lines[0]).toBe("Type,Date,Project,Stage,Reference,Charged,Paid");
    expect(lines[1]).toBe("Order (cancelled),2026-09-01,A Residence,Roofing,PO-2,,");
    expect(lines[2]).toBe("Order,2026-09-10,A Residence,Walling,PO-1,1000,");
    expect(lines[3]).toBe("Payment,2026-09-12,A Residence,Walling,PO-1 · RCPT 9,,400");
    expect(lines[4]).toBe("Total,,,,,1000,400");
    expect(lines[5]).toBe("Outstanding balance,,,,,600,");
  });
});

describe("export model", () => {
  it("hides the per-stage-only 'Required' headline under a finer filter", () => {
    const all = buildExportModel({ kind: "procurement", report: procurement }, ctx());
    const finer = buildExportModel(
      { kind: "procurement", report: procurement },
      ctx(state({ finerFilterActive: true })),
    );
    expect(all.headlines.map((h) => h.label)).toContain("Required");
    expect(finer.headlines.map((h) => h.label)).not.toContain("Required");
  });
});

describe("export filename", () => {
  const at = new Date("2026-09-28T22:30:00Z"); // 01:30 on 29 Sep in EAT

  it("dates the file in East Africa Time", () => {
    expect(eatIsoDate(at)).toBe("2026-09-29");
  });

  it("builds {Report}-{projectCode}-{date}[-filtered].{ext}", () => {
    expect(
      reportExportFilename({ kind: "procurement", scopeLabel: "PRJ-2026-001", format: "pdf", filtered: false, at }),
    ).toBe("Procurement-PRJ-2026-001-2026-09-29.pdf");
    expect(
      reportExportFilename({ kind: "material-cost", scopeLabel: "PRJ-2026-001", format: "csv", filtered: true, at }),
    ).toBe("Material-Cost-PRJ-2026-001-2026-09-29-filtered.csv");
  });

  it("names a statement after the party, header-safe", () => {
    expect(
      reportExportFilename({ kind: "supplier-statement", scopeLabel: 'Mawe & "Sons" Ltd', format: "jpg", filtered: false, at }),
    ).toBe("Statement-Mawe-Sons-Ltd-2026-09-29.jpg");
  });
});

describe("Report Export template", () => {
  const doc: ReportExportDocument = {
    kind: "procurement",
    data: { kind: "procurement", report: procurement },
    filterState: state({
      active: [{ dimension: "stage", value: "s1", label: "Walling" }],
      dateRangeActive: true,
      finerFilterActive: false,
    }),
    profile: { businessName: "Eng. Asha", phone: "+255 700 000 000", email: "a@example.com", logoDataUrl: null },
    asOf: new Date("2026-09-29T11:05:00Z"),
    scopeLabel: "PRJ-2026-001",
    meta: [{ label: "Project", value: "A Residence (PRJ-2026-001)" }],
    addressee: null,
    t,
    locale: "en",
  };
  const html = renderToStaticMarkup(
    <ReportExportDoc doc={doc} model={buildExportModel(doc.data, { t, locale: "en", filterState: doc.filterState })} />,
  );

  it("is dated 'As of' in EAT and states it is not an invoice", () => {
    expect(html).toContain("As of 29 Sep 2026, 14:05 EAT");
    expect(html).toContain("Not an invoice or request for payment.");
  });

  it("prints the Filtered line with 'figures as of today' for a date range", () => {
    expect(html).toContain("Filtered:");
    expect(html).toContain("Walling · figures as of today");
    expect(html).toContain("Total (filtered)");
  });

  it("carries no number and no lifecycle stamp", () => {
    expect(html).not.toContain("dochead__number");
    expect(html).not.toContain('class="stamp');
  });
});
