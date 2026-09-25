export const feeInvoices = {
  pageTitle: "Fee invoices",
  detailPageTitle: "Fee invoice",
  loading: "Loading fee invoices",
  status: {
    issued: "Issued",
    paid: "Paid",
  },
  list: {
    subtitle:
      "The supervision fee ledger — every Fee Invoice raised on this project, billed separately from client deposits.",
    empty:
      "No Fee Invoices yet. One is raised automatically when a stage's funding request is issued.",
    delta: "Delta",
    forRequest: "{stage} · {number}",
  },
  detail: {
    stage: "Stage",
    fundingRequest: "Funding request",
    amount: "Fee amount",
    basis: "Fee basis",
    basisFixed: "Fixed supervision fee for this stage",
    basisPercent: "{percent}% of the stage value",
    stageValue: "Stage value",
    issuedOn: "Issued {date}",
    paidOn: "Paid {date}",
    delta:
      "Delta invoice — raised for the fee added after the original was already paid.",
    paymentInstructions: "Payment instructions",
    document: "Fee Invoice {number}",
    backToAll: "Back to all fee invoices",
    markPaid: {
      title: "Mark as paid",
      body: "Record that this Fee Invoice's fee has been received. This cannot be undone.",
      action: "Mark as paid",
    },
  },
} as const;
