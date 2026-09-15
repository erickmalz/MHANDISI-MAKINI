/**
 * Enums shared by more than one domain table. Single-table enums stay colocated
 * with their table.
 */
import { pgEnum } from "drizzle-orm/pg-core";

/** Register status for the per-Account Supplier and Subcontractor registers. */
export const partyStatus = pgEnum("party_status", ["active", "inactive"]);

/**
 * How money moved, on a Deposit, a Supplier Payment or a Labour Payment
 * (guidelines §20, §22). "Payment" here is the counterparty's own record the
 * Engineer is logging, so the list mirrors the methods a Tanzanian client or
 * supplier actually uses.
 */
export const paymentMethod = pgEnum("payment_method", [
  "bank_transfer",
  "cash",
  "mobile_money",
  "cheque",
  "other",
]);

/**
 * The per-project counter each human-facing document number draws from
 * (multi-tenancy ticket 09 §5, ticket 10 §8). The sequence is per project and
 * per type — `FR-{project}-001`, `PO-{project}-001`, `FI-{project}-001`,
 * `VO-{project}-001`, `SCR-{project}-001` — and the next value is claimed
 * inside the same transaction that Issues (or, for a Variation, Approves —
 * or, for a Stage Closeout Report, Closes) the record.
 *
 * `stage_closeout_report` added Phase 4 ticket 03 (Slice 4.2) — minted inside
 * the same `closeStage` transaction that flips `stages.status = 'completed'`,
 * since Close Stage *is* issuing the report.
 */
export const documentNumberType = pgEnum("document_number_type", [
  "funding_request",
  "purchase_order",
  "fee_invoice",
  "variation",
  "stage_closeout_report",
]);
