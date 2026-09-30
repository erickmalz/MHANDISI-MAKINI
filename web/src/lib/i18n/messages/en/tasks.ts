export const tasks = {
  new: {
    pageTitle: "Add task",
    title: "Add a task",
    subtitle: "This will be task {seq} in {stage}.",
    submit: "Add task",
  },
  edit: {
    pageTitle: "Edit task",
    title: "Edit task",
    submit: "Save changes",
    cannotDelete:
      "This task has recorded labour payments, so it can't be deleted — set its status to {cancelled} instead.",
    delete: "Delete this task",
    deleteNote:
      "Removes the task and its material take-off. Its labour agreement stops counting against the stage.",
  },
  labour: {
    title: "Labour payments",
    outstanding: "Outstanding",
    none: "No payments recorded yet.",
    voided: "Voided",
    voidedWithReason: "Voided — {reason}",
    voidPayment: "Void payment",
    needAgreement: "Set a labour agreement amount above before recording a payment.",
    record: {
      title: "Record a payment",
      amount: "Amount (TZS)",
      paidOn: "Paid on",
      method: "Method",
      reference: "Reference",
      notes: "Notes",
      submit: "Record payment",
      submitting: "Recording…",
    },
    methods: {
      bankTransfer: "Bank transfer",
      mobileMoney: "Mobile money",
      cheque: "Cheque",
      cash: "Cash",
      other: "Other",
    },
    void: {
      reason: "Reason for voiding",
      aria: "Reason for voiding this payment",
    },
  },
  sourced: {
    fundingNote:
      "Raised from a task. Its material and labour lines update every time you save the task — change them there, not here.",
    poNote:
      "Raised from a task. Its lines update every time you save the task — change quantities there. Choose the supplier here before issuing.",
    viewTask: "Open the task",
    linkedTitle: "Linked documents",
    linkedBody:
      "Saving this task keeps its draft funding request and planned purchase order in step with its labour and materials. Once issued, they no longer change.",
    noneYet: "Nothing yet — add labour or material lines to raise the drafts.",
    fundingRequest: "Funding request",
    purchaseOrder: "Purchase order",
    draft: "Draft",
    noSupplier: "Supplier not chosen",
  },
} as const;
