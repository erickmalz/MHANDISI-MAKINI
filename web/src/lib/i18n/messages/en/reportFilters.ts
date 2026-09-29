/**
 * Report and Statement filters (ticket "Which filters each report gets"):
 * dimension names, the "All …" choice for each, and the date-range labels.
 */
export const reportFilters = {
  dimension: {
    stage: "Stage",
    project: "Project",
    supplier: "Supplier",
    subcontractor: "Subcontractor",
    status: "Status",
    kind: "Request type",
    funding: "Funding status",
    dates: "Dates",
  },
  all: {
    stage: "All stages",
    project: "All projects",
    supplier: "All suppliers",
    subcontractor: "All subcontractors",
    status: "All statuses",
    kind: "All request types",
    funding: "Any funding status",
  },
  kind: {
    base: "Base request",
    additional: "Additional request",
  },
  range: {
    issued: "Issued {range}",
    requested: "Requested {range}",
    dated: "Dated {range}",
    from: "from {date}",
    until: "up to {date}",
    fromLabel: "From",
    toLabel: "To",
  },
} as const;
