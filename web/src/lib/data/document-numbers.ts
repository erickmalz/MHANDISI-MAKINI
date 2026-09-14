import "server-only";

import { sql } from "drizzle-orm";

import type { AccountTx } from "./with-account";

/**
 * The per-project, per-type human-facing document number counter (multi-tenancy
 * ticket 09 §5, ticket 10 §8) — shared by the Funding Request / Fee Invoice
 * lifecycle (Slice 2.5) and the Purchase Order lifecycle (Slice 2.6).
 *
 * Claim the next number for `type` inside the same transaction that Issues (or,
 * for a Variation, Approves) the record. Gap-free and never reused: the
 * `document_number_sequences` row is created at 1 on first use, then bumped in
 * place. The formatted string (`PO-{project_code}-{008}`) is frozen onto the
 * issued record; this table only holds the counter.
 */
export async function claimDocumentNumber(
  tx: AccountTx,
  accountId: string,
  projectId: string,
  type: "funding_request" | "fee_invoice" | "purchase_order" | "variation",
): Promise<number> {
  const { rows } = await tx.execute<{ value: number }>(sql`
    INSERT INTO document_number_sequences (account_id, project_id, type, next_value)
    VALUES (${accountId}, ${projectId}, ${type}, 2)
    ON CONFLICT (project_id, type)
    DO UPDATE SET next_value = document_number_sequences.next_value + 1
    RETURNING next_value - 1 AS value
  `);
  return rows[0].value;
}

/** Left-pad a claimed sequence value to the 3-digit form used in every number. */
export const pad3 = (n: number): string => String(n).padStart(3, "0");
