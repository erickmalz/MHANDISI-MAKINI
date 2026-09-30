/**
 * The single Drizzle schema barrel. `drizzle.config.ts`, the runtime client
 * (`../db.ts`), and the better-auth adapter all import from here.
 */
export * from "./auth";
export * from "./accounts";
export * from "./platform-admins";
export * from "./admin-audit-log";

// Phase 2 domain schema (multi-tenancy ticket 08). Every table here is
// account-scoped and gets the standard RLS treatment (ENABLE + FORCE + the
// `account_isolation` policy) via the hand-merged block at the end of its
// migration.
export * from "./enums";

// Slice 2.1 — the structure tables (migration `0002_domain_structure`).
export * from "./projects";
export * from "./stages";
export * from "./subcontractors";
export * from "./suppliers";
export * from "./tasks";
export * from "./material-lines";

// Slice 2.2 — the money tables (migration `0003_money_tables`). Type-only
// `./snapshot` carries the `document_snapshot` shape and defines no table.
export * from "./snapshot";
export * from "./document-numbers";
export * from "./funding-requests";
export * from "./funding-request-lines";
export * from "./fee-invoices";
export * from "./fee-invoice-payments";
export * from "./deposits";
export * from "./purchase-orders";
export * from "./purchase-order-lines";
export * from "./delivery-records";
export * from "./payment-records";
export * from "./labour-payments";
export * from "./petty-cash-expenses";
export * from "./other-commitments";

// Operational Control Slice 4 — migration `0006_attachments`.
export * from "./attachments";

// Operational Control Slice 6 — migration `0007_stage_templates`.
export * from "./stage-templates";

// Phase 3 Slice 3.1 — migration `0008_variation_module`.
export * from "./variations";
export * from "./additional-funding-request-variations";

// Phase 3 Slice 3.3 — migration `0009_material_stock_movements`.
export * from "./material-stock-movements";

// Phase 4 Slice 4.1 — Site Diary + Progress Photos.
export * from "./site-diary-entries";
export * from "./photos";

// Phase 4 Slice 4.2 — Stage Closeout Report.
export * from "./stage-closeouts";

// Phase 4 Slice 4.3 — Project Closeout.
export * from "./project-closeouts";
