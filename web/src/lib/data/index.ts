import "server-only";

/**
 * The data-access layer barrel (multi-tenancy ticket 08 §3). Screens and
 * components import domain functions from `@/lib/data` and never touch Drizzle
 * or the connection pool directly — this module is the single funnel that
 * `withAccount` + Postgres RLS wrap.
 *
 * Slice 2.2 (read side): the project picker and overview. Slice 2.3 adds the
 * Purchase Order read side. Slice 2.4a adds the structure write side (Projects
 * and Stages). Slice 2.5 adds the Funding Request write lifecycle. Slice 2.4b
 * adds the reference registers (Suppliers, Subcontractors) and the remaining
 * structure writes (Tasks, Material Take-Off). Slice 2.6 adds the Purchase
 * Order write lifecycle.
 */
export { listProjects, getProjectOverview } from "./projects";
export {
  listPurchaseOrders,
  getPurchaseOrder,
  getPurchaseOrderDraftInput,
  createPurchaseOrderDraft,
  updatePurchaseOrderDraft,
  deletePurchaseOrderDraft,
  issuePurchaseOrder,
  recordDelivery,
  voidDelivery,
  recordPayment,
  voidPayment,
  cancelPurchaseOrder,
  closePurchaseOrder,
  reopenPurchaseOrder,
  recordSupplierAck,
  type POIssueResult,
  type DeliveryResult,
  type PaymentResult,
} from "./procurement";
export {
  getProjectInput,
  createProject,
  updateProject,
  getStageInput,
  createStage,
  updateStage,
  setCurrentStage,
} from "./structure";
export {
  listSuppliers,
  getSupplierInput,
  createSupplier,
  updateSupplier,
  listSubcontractors,
  getSubcontractorInput,
  createSubcontractor,
  updateSubcontractor,
} from "./registers";
export {
  listTasksForStage,
  getStageDetail,
  getTaskInput,
  createTask,
  updateTask,
  deleteTask,
} from "./tasks";
export {
  getDocumentProfile,
  getFundingRequestDocument,
  getFeeInvoiceDocument,
  getPurchaseOrderDocument,
  type DocumentProfile,
  type DocumentInput,
  type FundingRequestDocument,
  type FeeInvoiceDocument,
  type PurchaseOrderDocument,
} from "./documents";
export {
  getAccountProfile,
  updateAccountProfile,
  setAccountLogo,
  getAccountLogo,
  type AccountProfile,
  type AccountLogo,
} from "./account-profile";
export {
  listFundingRequests,
  getFundingRequest,
  getFundingRequestDraftInput,
  createFundingRequestDraft,
  updateFundingRequestDraft,
  deleteFundingRequestDraft,
  issueFundingRequest,
  supersedeFundingRequest,
  recordDeposit,
  voidDeposit,
  markFeeInvoicePaid,
  type IssueResult,
} from "./funding";
export { exportAccountData, type AccountDataExport } from "./export";
export {
  getAccountDeletionStatus,
  scheduleAccountDeletion,
  GRACE_PERIOD_DAYS,
  type AccountDeletionStatus,
} from "./account-deletion";
