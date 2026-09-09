import type { Project } from "./types";

/**
 * Prototype sample data — modeled loosely on the worked examples in
 * construction-supervision-app-expanded-guidelines.md (§7, §43, §49).
 *
 * The project picker, overview, Purchase Order and Funding Request screens now
 * read real per-Account records through `@/lib/data` (multi-tenancy ticket 08,
 * Slices 2.2–2.5). This file is **retained only** to hand a `Project` to the
 * still-mocked Purchase Order create screen; it is deleted when Slice 2.6
 * rebuilds that on the DAL (ticket 08 §5).
 */
export const projects: Project[] = [
  {
    id: "mbezi-beach-residence",
    code: "PRJ-2026-001",
    name: "Mbezi Beach Residence",
    clientName: "A. Mwakalinga",
    site: "Mbezi Beach, Dar es Salaam",
    currency: "TZS",
    currentStageId: "ground-floor",
    alerts: [
      { id: "a1", severity: "warning", message: "Purchase Order PO-034 missing supplier receipt" },
      { id: "a2", severity: "warning", message: "Task GF-07 has TZS 350,000 labour outstanding" },
      { id: "a3", severity: "info", message: "Additional Funding Request suggested for Roofing stage" },
    ],
    stages: [
      {
        id: "foundation",
        name: "Foundation",
        seq: 1,
        status: "Completed",
        progressPercent: 100,
        financials: {
          clientDeposits: 18_500_000,
          openPurchaseCommitments: 0,
          paidPurchases: 11_200_000,
          openLabourCommitments: 0,
          labourPayments: 6_400_000,
          pettyCashExpenses: 180_000,
          otherApprovedCommitments: 0,
          remainingMaterial: 0,
          remainingLabour: 0,
          remainingFee: 0,
          remainingOtherApproved: 0,
          feeInvoiced: 1_800_000,
          feeReceived: 1_800_000,
          fundingRequestPending: false,
        },
      },
      {
        id: "ground-floor",
        name: "Ground Floor",
        seq: 2,
        status: "Active",
        progressPercent: 64,
        financials: {
          clientDeposits: 28_000_000,
          openPurchaseCommitments: 4_200_000,
          paidPurchases: 9_800_000,
          openLabourCommitments: 2_800_000,
          labourPayments: 4_600_000,
          pettyCashExpenses: 350_000,
          otherApprovedCommitments: 0,
          remainingMaterial: 3_900_000,
          remainingLabour: 1_500_000,
          remainingFee: 800_000,
          remainingOtherApproved: 0,
          feeInvoiced: 3_100_000,
          feeReceived: 2_300_000,
          fundingRequestPending: false,
        },
      },
      {
        id: "roofing",
        name: "Roofing",
        seq: 3,
        status: "Awaiting Funding",
        progressPercent: 0,
        financials: {
          clientDeposits: 0,
          openPurchaseCommitments: 0,
          paidPurchases: 0,
          openLabourCommitments: 0,
          labourPayments: 0,
          pettyCashExpenses: 0,
          otherApprovedCommitments: 0,
          remainingMaterial: 6_200_000,
          remainingLabour: 3_400_000,
          remainingFee: 950_000,
          remainingOtherApproved: 0,
          feeInvoiced: 0,
          feeReceived: 0,
          fundingRequestPending: true,
        },
      },
    ],
  },
  {
    id: "kunduchi-family-home",
    code: "PRJ-2026-002",
    name: "Kunduchi Family Home",
    clientName: "N. Shayo",
    site: "Kunduchi, Dar es Salaam",
    currency: "TZS",
    currentStageId: "foundation-2",
    alerts: [],
    stages: [
      {
        id: "foundation-2",
        name: "Foundation",
        seq: 1,
        status: "Active",
        progressPercent: 38,
        financials: {
          clientDeposits: 15_000_000,
          openPurchaseCommitments: 1_000_000,
          paidPurchases: 2_500_000,
          openLabourCommitments: 500_000,
          labourPayments: 1_200_000,
          pettyCashExpenses: 100_000,
          otherApprovedCommitments: 0,
          remainingMaterial: 1_500_000,
          remainingLabour: 1_000_000,
          remainingFee: 500_000,
          remainingOtherApproved: 0,
          feeInvoiced: 1_200_000,
          feeReceived: 1_200_000,
          fundingRequestPending: false,
        },
      },
    ],
  },
  {
    id: "msasani-office-extension",
    code: "PRJ-2026-003",
    name: "Msasani Office Extension",
    clientName: "Coastal Traders Ltd.",
    site: "Msasani, Dar es Salaam",
    currency: "TZS",
    currentStageId: "ground-floor-3",
    alerts: [
      { id: "b1", severity: "critical", message: "Available Float is negative — supervisor funds temporarily financing this project" },
      { id: "b2", severity: "critical", message: "Additional Funding Request overdue" },
      { id: "b3", severity: "warning", message: "Supplier invoice SP-2026-003-011 unpaid" },
      { id: "b4", severity: "warning", message: "Missing delivery note for PO-2026-003-006" },
      { id: "b5", severity: "info", message: "Task OE-03 completed with unresolved variation" },
    ],
    stages: [
      {
        id: "ground-floor-3",
        name: "Ground Floor",
        seq: 1,
        status: "Active",
        progressPercent: 52,
        financials: {
          clientDeposits: 20_000_000,
          openPurchaseCommitments: 6_000_000,
          paidPurchases: 9_500_000,
          openLabourCommitments: 3_000_000,
          labourPayments: 2_750_000,
          pettyCashExpenses: 0,
          otherApprovedCommitments: 0,
          remainingMaterial: 2_000_000,
          remainingLabour: 2_500_000,
          remainingFee: 400_000,
          remainingOtherApproved: 0,
          feeInvoiced: 900_000,
          feeReceived: 500_000,
          fundingRequestPending: false,
        },
      },
    ],
  },
];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getCurrentStage(project: Project) {
  return project.stages.find((s) => s.id === project.currentStageId) ?? project.stages[0];
}
