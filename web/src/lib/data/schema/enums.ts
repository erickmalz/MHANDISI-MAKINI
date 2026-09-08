/**
 * Enums shared by more than one domain table. Single-table enums stay colocated
 * with their table.
 */
import { pgEnum } from "drizzle-orm/pg-core";

/** Register status for the per-Account Supplier and Subcontractor registers. */
export const partyStatus = pgEnum("party_status", ["active", "inactive"]);
