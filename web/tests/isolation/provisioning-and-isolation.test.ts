import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import { createUser, startIsolationDb, type IsolationDb } from "./harness";

/**
 * Ticket 06, test 1 (Phase 1 scope) — the two-account proof, at the layer
 * `getCurrentAccountId()` depends on:
 *   - the AFTER INSERT trigger provisions exactly one account per user
 *   - app.account_id_for_user resolves the tenant key across accounts without
 *     leaking, before any account context exists
 *   - once set, RLS scopes every read to that account
 * Phase 2 grows this into the full object-graph integration test through the
 * DAL.
 */
describe("account provisioning and cross-account isolation", () => {
  let db: IsolationDb;
  let owner: Client;
  let app: Client;
  let a: { userId: string; accountId: string };
  let b: { userId: string; accountId: string };

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    app = await db.appClient();
    a = await createUser(owner, "engineer-a@example.com");
    b = await createUser(owner, "engineer-b@example.com");
  });

  afterAll(async () => {
    await app.end();
    await owner.end();
    await db.stop();
  });

  it("creates exactly one account per user, with a v7 uuid", async () => {
    const { rows } = await owner.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM accounts",
    );
    expect(rows[0]!.n).toBe("2");
    expect(a.accountId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a.accountId).not.toBe(b.accountId);
  });

  it("copies name and phone from the user onto the account", async () => {
    const { rows } = await owner.query<{ full_name: string; phone: string }>(
      "SELECT full_name, phone FROM accounts WHERE user_id = $1",
      [a.userId],
    );
    expect(rows[0]).toEqual({
      full_name: "User engineer-a@example.com",
      phone: "+255700000000",
    });
  });

  it("account_id_for_user resolves each user's own account, and no other", async () => {
    const resolve = async (client: Client, userId: string) => {
      const { rows } = await client.query<{ account_id: string | null }>(
        "SELECT app.account_id_for_user($1) AS account_id",
        [userId],
      );
      return rows[0]!.account_id;
    };

    // via app_runtime, with no account context set (the request bootstrap path)
    expect(await resolve(app, a.userId)).toBe(a.accountId);
    expect(await resolve(app, b.userId)).toBe(b.accountId);
    expect(await resolve(app, "nobody")).toBeNull();
  });

  it("record_terms_acceptance writes through despite RLS", async () => {
    await app.query("SELECT app.record_terms_acceptance($1, $2)", [
      a.userId,
      "terms@1.0;privacy@1.0",
    ]);
    const { rows } = await owner.query<{
      accepted_terms_version: string;
      accepted_terms_at: Date;
    }>(
      "SELECT accepted_terms_version, accepted_terms_at FROM accounts WHERE user_id = $1",
      [a.userId],
    );
    expect(rows[0]!.accepted_terms_version).toBe("terms@1.0;privacy@1.0");
    expect(rows[0]!.accepted_terms_at).toBeInstanceOf(Date);
  });

  it("scopes reads to the current account once context is set", async () => {
    const seenBy = async (accountId: string) => {
      await app.query("BEGIN");
      await app.query("SELECT set_config('app.current_account_id', $1, true)", [
        accountId,
      ]);
      const { rows } = await app.query<{ user_id: string }>(
        "SELECT user_id FROM accounts",
      );
      await app.query("COMMIT");
      return rows.map((r) => r.user_id);
    };

    expect(await seenBy(a.accountId)).toEqual([a.userId]);
    expect(await seenBy(b.accountId)).toEqual([b.userId]);
  });
});
