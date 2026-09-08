import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";

import { startIsolationDb, type IsolationDb } from "./harness";

/**
 * Ticket 06, test 4 — schema conformance, the build-blocking lint.
 *
 * Every base table in `public` is either the tenant table (`accounts`), a
 * better-auth table (`auth_*`), or an **account-scoped domain table** — and
 * every domain table must carry the full isolation treatment:
 *   - ROW LEVEL SECURITY enabled AND forced
 *   - exactly one policy, `account_isolation`, with USING and WITH CHECK both
 *     `account_id = app.current_account_id()`
 *   - a NOT NULL `account_id` column
 *   - every foreign key into another account-scoped table carries `account_id`
 *
 * A new table (or a new FK) that skips any of this fails here — that is the
 * point. `accounts` keeps its documented exception (ENABLE, not FORCE — ADR
 * 0004).
 */

const AUTH_PREFIX = "auth_";
const TENANT_TABLE = "accounts";
// Tables that are not account-scoped and are exempt from the domain sweep.
const NON_DOMAIN = new Set([TENANT_TABLE, "__drizzle_migrations"]);

function isDomainTable(name: string): boolean {
  return !name.startsWith(AUTH_PREFIX) && !NON_DOMAIN.has(name);
}

describe("schema conformance", () => {
  let db: IsolationDb;
  let owner: Client;
  let domainTables: string[];

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    const { rows } = await owner.query<{ relname: string }>(
      `SELECT c.relname
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY c.relname`,
    );
    domainTables = rows.map((r) => r.relname).filter(isDomainTable);
  });

  afterAll(async () => {
    await owner.end();
    await db.stop();
  });

  it("finds the Slice 2.1 domain tables (sanity — the sweep is not empty)", () => {
    expect(domainTables).toEqual(
      expect.arrayContaining([
        "projects",
        "stages",
        "tasks",
        "suppliers",
        "subcontractors",
        "material_lines",
      ]),
    );
  });

  it("every domain table has RLS enabled AND forced", async () => {
    for (const table of domainTables) {
      const { rows } = await owner.query<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        `SELECT relrowsecurity, relforcerowsecurity
         FROM pg_class WHERE oid = $1::regclass`,
        [`public.${table}`],
      );
      expect(rows[0], `${table}: pg_class row`).toBeDefined();
      expect(rows[0]!.relrowsecurity, `${table}: RLS enabled`).toBe(true);
      expect(rows[0]!.relforcerowsecurity, `${table}: RLS forced`).toBe(true);
    }
  });

  it("every domain table has exactly the standard account_isolation policy", async () => {
    for (const table of domainTables) {
      const { rows } = await owner.query<{
        polname: string;
        qual: string | null;
        withcheck: string | null;
      }>(
        `SELECT polname,
                pg_get_expr(polqual, polrelid) AS qual,
                pg_get_expr(polwithcheck, polrelid) AS withcheck
         FROM pg_policy WHERE polrelid = $1::regclass`,
        [`public.${table}`],
      );
      expect(rows, `${table}: policy count`).toHaveLength(1);
      expect(rows[0]!.polname, `${table}: policy name`).toBe("account_isolation");
      for (const expr of [rows[0]!.qual, rows[0]!.withcheck]) {
        expect(expr, `${table}: policy has USING + WITH CHECK`).toBeTruthy();
        expect(expr).toContain("account_id");
        expect(expr).toContain("current_account_id()");
      }
    }
  });

  it("every domain table has a NOT NULL account_id column", async () => {
    for (const table of domainTables) {
      const { rows } = await owner.query<{ is_nullable: string }>(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'account_id'`,
        [table],
      );
      expect(rows[0], `${table}: has account_id`).toBeDefined();
      expect(rows[0]!.is_nullable, `${table}: account_id NOT NULL`).toBe("NO");
    }
  });

  it("every FK into another account-scoped table carries account_id", async () => {
    const { rows: fks } = await owner.query<{
      conname: string;
      tbl: string;
      reftbl: string;
      cols: string[];
    }>(
      `SELECT con.conname,
              con.conrelid::regclass::text  AS tbl,
              con.confrelid::regclass::text AS reftbl,
              ARRAY(
                SELECT a.attname FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
                ORDER BY k.ord
              ) AS cols
       FROM pg_constraint con
       WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace`,
    );

    const strip = (q: string) => q.replace(/^public\./, '').replace(/"/g, "");
    const offenders = fks
      .filter((fk) => isDomainTable(strip(fk.tbl)) && isDomainTable(strip(fk.reftbl)))
      .filter((fk) => !fk.cols.includes("account_id"))
      .map((fk) => `${fk.conname} (${strip(fk.tbl)} -> ${strip(fk.reftbl)})`);

    expect(offenders, "FKs missing account_id").toEqual([]);
  });

  // --- Fixed infrastructure from earlier slices ------------------------------

  it("accounts has RLS enabled but deliberately NOT forced (ADR 0004)", async () => {
    const { rows } = await owner.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity
       FROM pg_class WHERE oid = 'public.accounts'::regclass`,
    );
    expect(rows[0]!.relrowsecurity).toBe(true);
    expect(rows[0]!.relforcerowsecurity).toBe(false);
  });

  it("accounts has exactly one policy, keyed on the current account id", async () => {
    const { rows } = await owner.query<{ polname: string; qual: string }>(
      `SELECT polname, pg_get_expr(polqual, polrelid) AS qual
       FROM pg_policy WHERE polrelid = 'public.accounts'::regclass`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.qual).toContain("current_account_id()");
    expect(rows[0]!.qual).toContain("id =");
  });

  it("the standard RLS installer exists", async () => {
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
    expect(["8", "9", "a", "b"]).toContain(rows[0]!.v[19]);
  });
});
