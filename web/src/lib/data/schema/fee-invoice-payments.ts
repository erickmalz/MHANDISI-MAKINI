/**
 * `fee_invoice_payments` — money actually received against a Fee Invoice,
 * one row per instalment (CONTEXT.md "Fee Invoice"). A Fee Invoice can be paid
 * in full at once or in several part-payments; `Fee Received` is the sum of
 * these rows on the stage's non-void invoices.
 *
 * The invoice's own `status` stays `issued` while a balance remains ("Partially
 * paid" is read off these rows, never set by hand — the same posture as a
 * Purchase Order's Partially Paid state) and flips to `paid`, with `paid_at`,
 * the moment the rows reach the invoice amount. A payment can never exceed the
 * balance still owed.
 *
 * Append-only: once any payment is recorded the invoice is no longer corrected
 * or voided, the same rule that already held for a fully paid invoice.
 *
 * RLS is applied by `app.enable_standard_rls('fee_invoice_payments')` at the
 * end of migration `0014_fee_invoice_payments`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { paymentMethod } from "./enums";
import { feeInvoices } from "./fee-invoices";

export const feeInvoicePayments = pgTable(
  "fee_invoice_payments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`app.uuid_generate_v7()`),
    accountId: uuid("account_id").notNull(),
    feeInvoiceId: uuid("fee_invoice_id").notNull(),

    amount: bigint("amount", { mode: "number" }).notNull(),
    receivedOn: date("received_on").notNull(),
    // Nullable only for rows back-filled from the old one-click "Mark as paid",
    // which never captured how the fee was paid.
    method: paymentMethod("method"),
    reference: text("reference"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("fee_invoice_payments_id_account_id_key").on(t.id, t.accountId),
    foreignKey({
      name: "fee_invoice_payments_fee_invoice_id_account_id_fk",
      columns: [t.feeInvoiceId, t.accountId],
      foreignColumns: [feeInvoices.id, feeInvoices.accountId],
    }).onDelete("cascade"),
  ],
);
