/**
 * `additional_funding_request_variations` — the manual, purely informational
 * link an Engineer records between an Additional Funding Request and the
 * Approved Variation(s) it is collecting client money for (Phase 3 ticket 01
 * §4). Approving a Variation never auto-creates an AFR — raising one stays a
 * deliberate, separate action; this table just remembers which Variations a
 * given AFR was raised for once the Engineer links them.
 *
 * No computation depends on this table today. A future read (ticket 01 §4's
 * "Funded" derivation: a Variation reads as funded once every AFR/base-FR row
 * joined to it, if any, is `issued` or later) may query it, but this slice adds
 * no such helper.
 *
 * A plain three-column join, no surrogate id or timestamps — same minimal shape
 * as `document_number_sequences`. Composite-FK'd to both parents on
 * `(id, account_id)`, same honesty rule as every other cross-reference in this
 * schema; `ON DELETE CASCADE` on both sides — this row has no life of its own
 * once either parent is gone (same reasoning as `attachments`).
 *
 * RLS is applied by `app.enable_standard_rls('additional_funding_request_variations')`
 * in the hand-merged block at the end of this table's migration.
 */
import { foreignKey, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { fundingRequests } from "./funding-requests";
import { variations } from "./variations";

export const additionalFundingRequestVariations = pgTable(
  "additional_funding_request_variations",
  {
    accountId: uuid("account_id").notNull(),
    fundingRequestId: uuid("funding_request_id").notNull(),
    variationId: uuid("variation_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.fundingRequestId, t.variationId] }),
    foreignKey({
      name: "afr_variations_funding_request_id_account_id_fk",
      columns: [t.fundingRequestId, t.accountId],
      foreignColumns: [fundingRequests.id, fundingRequests.accountId],
    }).onDelete("cascade"),
    foreignKey({
      name: "afr_variations_variation_id_account_id_fk",
      columns: [t.variationId, t.accountId],
      foreignColumns: [variations.id, variations.accountId],
    }).onDelete("cascade"),
  ],
);
