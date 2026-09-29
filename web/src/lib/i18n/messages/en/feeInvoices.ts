export const feeInvoices = {
  pageTitle: "Fee invoices",
  detailPageTitle: "Fee invoice",
  loading: "Loading fee invoices",
  status: {
    issued: "Issued",
    paid: "Paid",
    void: "Void",
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
    voidedOn: "Voided {date}:",
    correctedOn: "Amount corrected {date} (was {amount}):",
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
    correct: {
      title: "Correct the amount",
      body: "Fix a wrong fee under the same invoice number. The reason is kept and printed on the invoice.",
      amount: "Correct fee amount",
      reason: "Reason for the correction",
      action: "Save correction",
      submitting: "Saving…",
    },
    void: {
      title: "Void this invoice",
      body: "For an invoice raised in error. It stays on record, stamped VOID, and no longer counts as fee owed. This cannot be undone.",
      reason: "Reason for voiding",
      action: "Void invoice",
      submitting: "Voiding…",
    },
  },
} as const;
