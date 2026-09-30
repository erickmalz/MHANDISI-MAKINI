/**
 * `fee_invoices` — the supervisor's fee for one stage, a ledger entirely
 * separate from that stage's Deposits (CONTEXT.md "Fee Invoice"; Phase 1 Fee
 * Collection Method / Fee Recognition Timing decisions).
 *
 * Raised inside the Funding Request Issue transaction (multi-tenancy ticket 09
 * §1), so a row here always has a number and a snapshot — there is no `draft`
 * Fee Invoice. Lifecycle is `issued → paid`. Money received is logged in
 * `fee_invoice_payments`, possibly across several part-payments: the invoice
 * stays `issued` ("Partially paid" once any payment exists) until the payments
 * reach `fee_amount`, then becomes `paid` (`paid_at` records that moment).
 * `Fee Received` / `Fee Earned` move with each payment.
 *
 * Follow-ups: if a superseding Funding Request version raises the fee after the
 * original was already `paid`, a **delta** Fee Invoice is raised for the
 * difference (`is_delta`, `parent_fee_invoice_id`). An unpaid original is
 * instead reissued with the new version and this row moves to `superseded`.
 *
 * Corrections, while still `issued` with nothing received, and always with a recorded reason:
 *  - **Void** — the invoice was raised in error. `status` → `void`, `voided_at`
 *    + `void_reason` are set; the row and its number stay (the sequence never
 *    has gaps) and every projection ignores it, the same append-only-with-
 *    reversal posture as a voided Deposit.
 *  - **Correct** — the amount was wrong. `fee_amount` is amended in place under
 *    the same number and the snapshot rebuilt; `original_fee_amount` keeps the
 *    amount first billed (set on the first correction only), and
 *    `correction_reason` / `corrected_at` record the latest one.
 * An invoice with any payment against it is never voided or corrected
 * (CONTEXT.md "Fee Invoice").
 *
 * Numbering: its own per-project sequence, `FI-{project}-NNN` (ticket 10 §8).
 *
 * RLS is applied by `app.enable_standard_rls('fee_invoices')` in the
 * hand-merged block at the end of migration `0003_money_tables`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { fundingRequests } from "./funding-requests";
import type { DocumentSnapshot } from "./snapshot";
import { feeBasis, stages } from "./stages";

export const feeInvoiceStatus = pgEnum("fee_invoice_status", ["issued", "paid", "void"]);

export const feeInvoices = pgTable(
  "fee_invoices",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    // The Funding Request version whose Issue raised this invoice.
    fundingRequestId: uuid("funding_request_id").notNull(),

    status: feeInvoiceStatus("status").notNull().default("issued"),

    baseNumber: integer("base_number").notNull(),
    displayNumber: text("display_number").notNull(),

    // Delta follow-up (see file header).
    isDelta: boolean("is_delta").notNull().default(false),
    parentFeeInvoiceId: uuid("parent_fee_invoice_id"),

    // The fee as billed. `fee_basis` + `fee_percent` + `basis_value` record how
    // it was worked out for the document; `fee_amount` is the invoice total.
    feeBasis: feeBasis("fee_basis").notNull(),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 }),
    basisValue: bigint("basis_value", { mode: "number" }),
    feeAmount: bigint("fee_amount", { mode: "number" }).notNull(),

    paymentInstructions: text("payment_instructions"),

    // Present from creation (a Fee Invoice is only ever post-Issue).
    documentSnapshot: jsonb("document_snapshot").$type<DocumentSnapshot>().notNull(),

    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),

    // Correction trail (see file header).
    originalFeeAmount: bigint("original_fee_amount", { mode: "number" }),
    correctionReason: text("correction_reason"),
    correctedAt: timestamp("corrected_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("fee_invoices_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "fee_invoices_stage_id_account_id_fk",
      columns: [t.stageId, t.accountId],
      foreignColumns: [stages.id, stages.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fee_invoices_funding_request_id_account_id_fk",
      columns: [t.fundingRequestId, t.accountId],
      foreignColumns: [fundingRequests.id, fundingRequests.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fee_invoices_parent_fee_invoice_id_account_id_fk",
      columns: [t.parentFeeInvoiceId, t.accountId],
      foreignColumns: [t.id, t.accountId],
    }).onDelete("no action"),
  ],
);
