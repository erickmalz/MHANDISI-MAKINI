import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import {
  createUser,
  seedProjectGraph,
  startIsolationDb,
  type IsolationDb,
  type ProjectGraph,
} from "./harness";

/**
 * Ticket 06, test 1 — account provisioning and the two-account object-graph
 * proof, the core isolation guarantee:
 *   - the AFTER INSERT trigger provisions exactly one account per user
 *   - `app.account_id_for_user` resolves the tenant key before any account
 *     context exists, without leaking across accounts
 *   - with the GUC set to account A, every domain table returns only A's rows;
 *     A cannot read, update, or delete B's rows; A cannot write B's account_id
 *
 * The graph here is Slice 2.1's structure tables; later slices extend
 * `seedProjectGraph` with the money records and this test grows with it.
 */
describe("account provisioning and cross-account isolation", () => {
  let db: IsolationDb;
  let owner: Client;
  let app: Client;
  let a: { userId: string; accountId: string };
  let b: { userId: string; accountId: string };
  let graphA: ProjectGraph;
  let graphB: ProjectGraph;

  const DOMAIN_TABLES = [
    "projects",
    "stages",
    "tasks",
    "material_lines",
    "suppliers",
    "subcontractors",
  ] as const;

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    app = await db.appClient();
    a = await createUser(owner, "engineer-a@example.com");
    b = await createUser(owner, "engineer-b@example.com");
    graphA = await seedProjectGraph(app, a.accountId, "A");
    graphB = await seedProjectGraph(app, b.accountId, "B");
  });

  afterAll(async () => {
    await app.end();
    await owner.end();
    await db.stop();
  });

  /** Runs `fn` in a transaction with the account GUC set to `accountId`. */
  async function asAccount<T>(
    accountId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    await app.query("BEGIN");
    try {
      await app.query("SELECT set_config('app.current_account_id', $1, true)", [
        accountId,
      ]);
      return await fn();
    } finally {
      await app.query("COMMIT");
    }
  }

  it("creates exactly one account per user, each with a distinct v7 uuid", async () => {
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

  it("account_id_for_user resolves each user's own account, and no other", async () => {
    const resolve = async (userId: string) =>
      (
        await app.query<{ account_id: string | null }>(
          "SELECT app.account_id_for_user($1) AS account_id",
          [userId],
        )
      ).rows[0]!.account_id;

    expect(await resolve(a.userId)).toBe(a.accountId);
    expect(await resolve(b.userId)).toBe(b.accountId);
    expect(await resolve("nobody")).toBeNull();
  });

  it("scopes every domain table to the current account", async () => {
    for (const table of DOMAIN_TABLES) {
      const seenBy = async (accountId: string) =>
        asAccount(accountId, async () => {
          const { rows } = await app.query<{ account_id: string }>(
            `SELECT account_id FROM ${table}`,
          );
          return rows;
        });

      const forA = await seenBy(a.accountId);
      const forB = await seenBy(b.accountId);
      expect(forA.length, `${table}: A sees 1 row`).toBe(1);
      expect(forA[0]!.account_id, `${table}: it is A's`).toBe(a.accountId);
      expect(forB.length, `${table}: B sees 1 row`).toBe(1);
      expect(forB[0]!.account_id, `${table}: it is B's`).toBe(b.accountId);
    }
  });

  it("returns zero rows for another account's ids (a cross-account read is 'not found')", async () => {
    await asAccount(a.accountId, async () => {
      const q = async (table: string, id: string) =>
        (await app.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id])).rowCount;
      expect(await q("projects", graphB.projectId)).toBe(0);
      expect(await q("stages", graphB.stageId)).toBe(0);
      expect(await q("tasks", graphB.taskId)).toBe(0);
      expect(await q("material_lines", graphB.materialLineId)).toBe(0);
      expect(await q("suppliers", graphB.supplierId)).toBe(0);
      expect(await q("subcontractors", graphB.subcontractorId)).toBe(0);
    });
  });

  it("cannot update or delete another account's rows (no-op, not error)", async () => {
    await asAccount(a.accountId, async () => {
      const upd = await app.query(
        "UPDATE projects SET name = 'hijacked' WHERE id = $1",
        [graphB.projectId],
      );
      expect(upd.rowCount).toBe(0);
      const del = await app.query("DELETE FROM stages WHERE id = $1", [
        graphB.stageId,
      ]);
      expect(del.rowCount).toBe(0);
    });
    // B's rows are untouched — read them back as B (FORCE ROW LEVEL SECURITY
    // applies to the table owner too, so `owner` cannot see across accounts).
    const bView = await asAccount(b.accountId, async () => {
      const project = await app.query<{ name: string }>(
        "SELECT name FROM projects WHERE id = $1",
        [graphB.projectId],
      );
      const stage = await app.query("SELECT 1 FROM stages WHERE id = $1", [
        graphB.stageId,
      ]);
      return { name: project.rows[0]?.name, stageRows: stage.rowCount };
    });
    expect(bView.name).toBe("B Residence");
    expect(bView.stageRows).toBe(1);
  });

  it("WITH CHECK blocks writing another account's account_id", async () => {
    await expect(
      asAccount(a.accountId, async () => {
        await app.query(
          `INSERT INTO suppliers (account_id, name) VALUES ($1, 'smuggled')`,
          [b.accountId],
        );
      }),
    ).rejects.toThrow();
  });

  it("A's own graph is fully reachable (guards against a false negative)", async () => {
    await asAccount(a.accountId, async () => {
      for (const [table, id] of [
        ["projects", graphA.projectId],
        ["stages", graphA.stageId],
        ["tasks", graphA.taskId],
        ["material_lines", graphA.materialLineId],
        ["suppliers", graphA.supplierId],
        ["subcontractors", graphA.subcontractorId],
      ] as const) {
        const { rowCount } = await app.query(
          `SELECT 1 FROM ${table} WHERE id = $1`,
          [id],
        );
        expect(rowCount, `${table}: A reaches its own row`).toBe(1);
      }
    });
  });

  it("unset GUC on a domain table returns zero rows (fails closed)", async () => {
    const { rows } = await app.query("SELECT 1 FROM projects");
    expect(rows).toEqual([]);
  });
});
