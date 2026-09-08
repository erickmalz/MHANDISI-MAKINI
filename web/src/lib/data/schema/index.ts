/**
 * The single Drizzle schema barrel. `drizzle.config.ts`, the runtime client
 * (`../db.ts`), and the better-auth adapter all import from here.
 */
export * from "./auth";
export * from "./accounts";

// Phase 2 domain schema (multi-tenancy ticket 08). Slice 2.1 — the structure
// tables; the money tables follow. Every table here is account-scoped and gets
// the standard RLS treatment (ENABLE + FORCE + the `account_isolation` policy)
// via the hand-merged block at the end of migration `0002_domain_structure`.
export * from "./enums";
export * from "./projects";
export * from "./stages";
export * from "./subcontractors";
export * from "./suppliers";
export * from "./tasks";
export * from "./material-lines";
