export const status = {
  stage: {
    planned: "Planned",
    active: "Active",
    awaitingFunding: "Awaiting funding",
    onHold: "On hold",
    readyForCloseout: "Ready for closeout",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  task: {
    planned: "Planned",
    active: "Active",
    onHold: "On hold",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  project: {
    active: "Active",
    onHold: "On hold",
    completed: "Completed",
    archived: "Archived",
  },
} as const;
