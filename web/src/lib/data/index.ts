import "server-only";

/**
 * The data-access layer barrel (multi-tenancy ticket 08 §3). Screens and
 * components import domain functions from `@/lib/data` and never touch Drizzle
 * or the connection pool directly — this module is the single funnel that
 * `withAccount` + Postgres RLS wrap.
 *
 * Slice 2.2 (read side): the project picker and overview. Slice 2.3 adds the
 * Purchase Order read side. The structure write side lands with Slice 2.4; the
 * funding / procurement write functions land with Slices 2.5–2.6.
 */
export { listProjects, getProjectOverview } from "./projects";
export { listPurchaseOrders, getPurchaseOrder } from "./procurement";
