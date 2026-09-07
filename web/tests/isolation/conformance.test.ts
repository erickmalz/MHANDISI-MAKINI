import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import { startIsolationDb, type IsolationDb } from "./harness";

/**
 * Ticket 06, test 4 — schema conformance. In Phase 1 this checks the one
 * account-scoped table (`accounts`). Phase 2 extends it into the build-blocking
 * lint over every domain table: RLS enabled + forced, exactly the standard
 * policy, a NOT NULL account_id, and account_id on every FK into a parent.
 */
describe("schema conformance", () => {
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

  it("accounts has row-level security enabled", async () => {
    const { rows } = await owner.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity
       FROM pg_class WHERE oid = 'public.accounts'::regclass`,
    );
    // ENABLE, deliberately not FORCE — the owner bootstrap-writes this one
    // table via the provisioning trigger (ADR 0004).
    expect(rows[0]!.relrowsecurity).toBe(true);
    expect(rows[0]!.relforcerowsecurity).toBe(false);
  });

  it("accounts has exactly one policy, keyed on app.current_account_id", async () => {
    const { rows } = await owner.query<{ polname: string; qual: string }>(
      `SELECT polname, pg_get_expr(polqual, polrelid) AS qual
       FROM pg_policy WHERE polrelid = 'public.accounts'::regclass`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.qual).toContain("app.current_account_id");
    expect(rows[0]!.qual).toContain("id =");
  });

  it("the standard RLS installer exists for Phase 2 domain tables", async () => {
    const { rows } = await owner.query(
      `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'app' AND p.proname = 'enable_standard_rls'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("uuid v7 helper produces a version-7 variant-2 uuid", async () => {
    const { rows } = await owner.query<{ v: string; version: string }>(
      `SELECT g::text AS v, substring(g::text from 15 for 1) AS version
       FROM app.uuid_generate_v7() g`,
    );
    expect(rows[0]!.version).toBe("7");
    // variant nibble is one of 8,9,a,b
    expect(["8", "9", "a", "b"]).toContain(rows[0]!.v[19]);
  });
});
