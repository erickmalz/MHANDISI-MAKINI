import "server-only";

import { sql } from "drizzle-orm";

import { getCurrentAccountId } from "./account-context";
import { db } from "./db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` inside one transaction with `app.current_account_id` set to the
 * caller's tenant key as statement 1 (multi-tenancy ticket 06). Postgres
 * row-level security then scopes every read and write in `fn` automatically;
 * a missing/forgotten filter cannot leak another account's rows.
 *
 * `set_config(..., true)` is transaction-local, so a pooled connection resets
 * on commit. Every account-scoped DAL function in `@/lib/data` (Phase 2) is a
 * thin wrapper over this.
 */
export async function withAccount<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const accountId = await getCurrentAccountId();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_account_id', ${accountId}, true)`,
    );
    return fn(tx);
  });
}
