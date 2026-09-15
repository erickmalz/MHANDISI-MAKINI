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
export {
  listProjects,
  getProjectOverview,
  getAccumulatedMaterialVariance,
} from "./projects";
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
  type EditableTakeOffLine,
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
export {
  getSupplierStatement,
  getSubcontractorStatement,
  type SupplierStatement,
  type SubcontractorStatement,
} from "./statements";
export {
  getAttachmentMeta,
  getAttachmentFile,
  setAttachment,
  type AttachmentTarget,
  type AttachmentMeta,
  type AttachmentFile,
} from "./attachments";
export {
  listStageTemplates,
  listStageTemplatesForApply,
  getStageTemplateInput,
  createStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  createTemplateFromProject,
} from "./stage-templates";
export {
  listVariationsForStage,
  getVariation,
  getVariationDraftInput,
  createVariationDraft,
  updateVariationDraft,
  deleteVariationDraft,
  approveVariation,
  rejectVariation,
  cancelVariation,
  linkVariationsToFundingRequest,
  type ApproveVariationResult,
} from "./variations";
export {
  getStockBalances,
  listStockMovements,
  listKnownMaterialItems,
  getStockBalance,
  carryForwardSurplus,
  writeOffStock,
  type StockLine,
  type StockBalance,
  type StockMovement,
} from "./material-stock";
export {
  getStageCloseoutGates,
  closeStage,
  resolveSurplusMaterials,
  type CloseStageResult,
} from "./stage-closeout";
export { getStageReconciliationReport } from "./reconciliation";
export { getProjectActivity, type ActivityEvent, type ActivityRecordType } from "./activity";
export {
  getProjectFinancialSummary,
  getMaterialCostReport,
  getProcurementReport,
  getLabourReport,
  getFundingReport,
  getVariationReport,
  type ProjectFinancialSummary,
  type ProjectFinancialSummaryStageRow,
  type MaterialCostReport,
  type MaterialCostReportRow,
  type ProcurementReport,
  type ProcurementReportRow,
  type LabourReport,
  type LabourReportRow,
  type FundingReport,
  type FundingReportRow,
  type VariationReport,
  type VariationReportRow,
} from "./reports";
