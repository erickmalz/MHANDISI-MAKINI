import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import { startIsolationDb, type IsolationDb } from "./harness";

/**
 * Ticket 06, test 3 — role capabilities. `app_runtime` must be a plain,
 * non-owning, RLS-bound role; only `maintenance` may bypass RLS.
 */
describe("role capabilities", () => {
  let db: IsolationDb;
  let owner: Client;

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
  });

  afterAll(async () => {
    await owner.end();
    await db.stop();
  });

  it("app_runtime is not a superuser and cannot bypass RLS", async () => {
    const { rows } = await owner.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
    }>(
      `SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
       FROM pg_roles WHERE rolname = 'app_runtime'`,
    );
    expect(rows[0]).toMatchObject({
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
    });
  });

  it("maintenance bypasses RLS but is not a superuser", async () => {
    const { rows } = await owner.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'maintenance'`,
    );
    expect(rows[0]).toMatchObject({ rolsuper: false, rolbypassrls: true });
  });

  it("app_runtime owns no table in the public schema", async () => {
    const { rows } = await owner.query<{ relname: string }>(
      `SELECT c.relname
       FROM pg_class c
       JOIN pg_roles r ON r.oid = c.relowner
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE r.rolname = 'app_runtime' AND n.nspname = 'public' AND c.relkind = 'r'`,
    );
    expect(rows).toEqual([]);
  });
});
