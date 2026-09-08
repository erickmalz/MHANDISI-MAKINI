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
 * Ticket 06, test 5 — the composite foreign keys that keep the denormalised
 * `account_id` honest. Every child row's `(parent_id, account_id)` must match a
 * real `(id, account_id)` on the parent, so a child can never claim an
 * `account_id` its parent does not have.
 *
 * Tested beneath RLS (`SET row_security = off`, superuser) so the failure is
 * the FK itself, not a policy `WITH CHECK` — the app never has this connection.
 */
describe("composite foreign keys", () => {
  let db: IsolationDb;
  let owner: Client;
  let app: Client;
  let su: Client;
  let a: { userId: string; accountId: string };
  let b: { userId: string; accountId: string };
  let graphA: ProjectGraph;
  let graphB: ProjectGraph;

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    app = await db.appClient();
    su = await db.superuserClient();
    await su.query("SET row_security = off");
    a = await createUser(owner, "a@example.com");
    b = await createUser(owner, "b@example.com");
    graphA = await seedProjectGraph(app, a.accountId, "A");
    graphB = await seedProjectGraph(app, b.accountId, "B");
  });

  afterAll(async () => {
    await su.end();
    await app.end();
    await owner.end();
    await db.stop();
  });

  it("rejects a stage whose account_id differs from its project's", async () => {
    await expect(
      su.query(
        `INSERT INTO stages (account_id, project_id, name, seq)
         VALUES ($1, $2, 'Mismatch', 9)`,
        [b.accountId, graphA.projectId],
      ),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("rejects a task whose account_id differs from its stage's", async () => {
    await expect(
      su.query(
        `INSERT INTO tasks (account_id, stage_id, description, seq)
         VALUES ($1, $2, 'Mismatch', 9)`,
        [b.accountId, graphA.stageId],
      ),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("rejects a material line whose account_id differs from its task's", async () => {
    await expect(
      su.query(
        `INSERT INTO material_lines (account_id, task_id, item, unit)
         VALUES ($1, $2, 'Mismatch', 'bag')`,
        [b.accountId, graphA.taskId],
      ),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("accepts a matching (parent_id, account_id) pair", async () => {
    const { rows } = await su.query<{ id: string }>(
      `INSERT INTO stages (account_id, project_id, name, seq)
       VALUES ($1, $2, 'Superstructure', 2) RETURNING id`,
      [b.accountId, graphB.projectId],
    );
    expect(rows[0]!.id).toBeTruthy();
  });
});
