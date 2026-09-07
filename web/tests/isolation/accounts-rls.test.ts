import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import { createUser, startIsolationDb, type IsolationDb } from "./harness";

/**
 * Ticket 06, test 2 — raw-connection RLS, bypassing any application code.
 * As `app_runtime` directly against `accounts`:
 *   - the GUC scopes SELECT to exactly one row
 *   - an unknown / unset GUC returns nothing (fails closed)
 *   - WITH CHECK blocks moving a row to another account
 */
describe("accounts row-level security", () => {
  let db: IsolationDb;
  let owner: Client;
  let app: Client;
  let a: { userId: string; accountId: string };
  let b: { userId: string; accountId: string };

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    app = await db.appClient();
    a = await createUser(owner, "a@example.com");
    b = await createUser(owner, "b@example.com");
  });

  afterAll(async () => {
    await app.end();
    await owner.end();
    await db.stop();
  });

  it("scopes SELECT to the account in app.current_account_id", async () => {
    await app.query("BEGIN");
    await app.query("SELECT set_config('app.current_account_id', $1, true)", [
      a.accountId,
    ]);
    const { rows } = await app.query<{ id: string }>("SELECT id FROM accounts");
    await app.query("COMMIT");

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(a.accountId);
  });

  it("returns zero rows when the GUC is unset (fails closed)", async () => {
    const { rows } = await app.query("SELECT id FROM accounts");
    expect(rows).toEqual([]);
  });

  it("returns zero rows for an unknown account id", async () => {
    await app.query("BEGIN");
    await app.query("SELECT set_config('app.current_account_id', $1, true)", [
      "00000000-0000-7000-8000-000000000000",
    ]);
    const { rows } = await app.query("SELECT id FROM accounts");
    await app.query("COMMIT");
    expect(rows).toEqual([]);
  });

  it("blocks reassigning a row to another account (WITH CHECK)", async () => {
    await app.query("BEGIN");
    await app.query("SELECT set_config('app.current_account_id', $1, true)", [
      a.accountId,
    ]);
    await expect(
      app.query("UPDATE accounts SET id = $1 WHERE id = $2", [
        b.accountId,
        a.accountId,
      ]),
    ).rejects.toThrow();
    await app.query("ROLLBACK");
  });
});
