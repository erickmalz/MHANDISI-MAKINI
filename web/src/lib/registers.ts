/**
 * The per-Account reference registers — view-model types, no data access, safe
 * to import from client components (Slice 2.4b).
 *
 * The Supplier Register (guidelines §25) and Subcontractor Register (§26) are
 * reused across the Account's projects: a Purchase Order names a Supplier from
 * the register, a Task is assigned one Subcontractor from it. The rich profile
 * rollups (§25 "Total orders / purchases / paid / outstanding") are derived
 * from Purchase Order data and arrive with that lifecycle — the register itself
 * is a plain directory.
 */

/** `active | inactive` — the `party_status` enum. */
export type PartyStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  paymentTerms: string | null;
  notes: string | null;
  status: PartyStatus;
}

export interface Subcontractor {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: PartyStatus;
}
