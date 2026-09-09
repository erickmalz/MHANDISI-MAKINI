import "server-only";

/**
 * The data-access layer barrel (multi-tenancy ticket 08 §3). Screens and
 * components import domain functions from `@/lib/data` and never touch Drizzle
 * or the connection pool directly — this module is the single funnel that
 * `withAccount` + Postgres RLS wrap.
 *
 * Slice 2.2 (read side): the project picker and overview. Slice 2.3 adds the
 * Purchase Order read side. Slice 2.4a adds the structure write side (Projects
 * and Stages); the remaining structure writes (2.4b) and the funding /
 * procurement write functions land with Slices 2.4b–2.6.
 */
export { listProjects, getProjectOverview } from "./projects";
export { listPurchaseOrders, getPurchaseOrder } from "./procurement";
export {
  getProjectInput,
  createProject,
  updateProject,
  getStageInput,
  createStage,
  updateStage,
  setCurrentStage,
} from "./structure";
