/**
 * Report Exports (`.scratch/reports-toolbar/`): the dated PDF / JPG / CSV
 * renderings of a Report or Statement. Report-specific column and figure
 * labels are reused from the `reports`, `suppliers` and `subcontractors`
 * namespaces; only what those don't already carry lives here.
 */
export const reportExport = {
  asOf: "As of {date}",
  filtered: "Filtered",
  figuresAsOfToday: "figures as of today",
  footer: "Live figures at the time shown. Not an invoice or request for payment.",
  totalFiltered: "Total (filtered)",
  project: "Project",
  client: "Client",
  site: "Site",
  statementFor: "Statement for {name}",
  supplierStatement: "Supplier statement",
  subcontractorStatement: "Subcontractor statement",
  contact: "Contact",
  noRows: "Nothing to show for these filters.",
  outstandingFiltered: "Outstanding (filtered)",
  columns: {
    status: "Status",
    kind: "Kind",
    type: "Type",
    date: "Date",
    project: "Project",
    stage: "Stage",
    reference: "Reference",
    description: "Description",
    amount: "Amount",
    charged: "Charged",
    paid: "Paid",
  },
  ledger: {
    order: "Order",
    agreement: "Agreement",
    payment: "Payment",
    cancelled: "{type} (cancelled)",
    total: "Total",
    outstanding: "Outstanding balance",
  },
  kind: {
    base: "Base",
    additional: "Additional",
  },
} as const;
