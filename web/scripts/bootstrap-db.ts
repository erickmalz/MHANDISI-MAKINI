/**
 * Creates the three roles and the application database, and hands `public` +
 * `app` to the owner — the same setup docker/postgres/init/00-roles.sql does
 * for local compose, but callable from CI and the isolation tests where the
 * database starts as a bare `postgres` instance.
 *
 * As a script: `SUPERUSER_DATABASE_URL=postgres://postgres:...@host/postgres \
 *   npx tsx scripts/bootstrap-db.ts`
 */
import "dotenv/config";

import { pathToFileURL } from "node:url";

import { Client } from "pg";

export type BootstrapOptions = {
  /** A superuser connection string to an existing database (e.g. `postgres`). */
  superuserUrl: string;
  database?: string;
  ownerPassword?: string;
  appPassword?: string;
  maintenancePassword?: string;
};

export async function bootstrapDatabase(opts: BootstrapOptions): Promise<void> {
  const database = opts.database ?? "mhandisi";
  const ownerPw = opts.ownerPassword ?? "owner_local_dev";
  const appPw = opts.appPassword ?? "app_local_dev";
  const maintenancePw = opts.maintenancePassword ?? "maintenance_local_dev";

  const su = new Client({ connectionString: opts.superuserUrl });
  await su.connect();
  try {
    const roleExists = async (role: string) =>
      ((await su.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]))
        .rowCount ?? 0) > 0;

    if (!(await roleExists("mhandisi_owner"))) {
      await su.query(
        `CREATE ROLE mhandisi_owner LOGIN PASSWORD '${ownerPw}' NOSUPERUSER NOBYPASSRLS CREATEDB NOCREATEROLE`,
      );
    }
    if (!(await roleExists("app_runtime"))) {
      await su.query(
        `CREATE ROLE app_runtime LOGIN PASSWORD '${appPw}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
      );
    }
    if (!(await roleExists("maintenance"))) {
      await su.query(
        `CREATE ROLE maintenance LOGIN PASSWORD '${maintenancePw}' NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE`,
      );
    }

    const dbExists =
      ((await su.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]))
        .rowCount ?? 0) > 0;
    if (!dbExists) {
      await su.query(`CREATE DATABASE ${database} OWNER mhandisi_owner`);
    }
  } finally {
    await su.end();
  }

  // Fix schema ownership / grants inside the target database, as superuser.
  const targetUrl = new URL(opts.superuserUrl);
  targetUrl.pathname = `/${database}`;
  const targetDb = new Client({ connectionString: targetUrl.toString() });
  await targetDb.connect();
  try {
    await targetDb.query(
      `GRANT CONNECT ON DATABASE ${database} TO app_runtime, maintenance`,
    );
    await targetDb.query(
      "CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION mhandisi_owner",
    );
    await targetDb.query("ALTER SCHEMA public OWNER TO mhandisi_owner");
    await targetDb.query("REVOKE ALL ON SCHEMA public FROM PUBLIC");
    await targetDb.query("GRANT USAGE ON SCHEMA public TO app_runtime, maintenance");
    await targetDb.query("GRANT USAGE ON SCHEMA app TO app_runtime, maintenance");
  } finally {
    await targetDb.end();
  }
}

// Run directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const superuserUrl = process.env.SUPERUSER_DATABASE_URL;
  if (!superuserUrl) {
    console.error("SUPERUSER_DATABASE_URL is not set.");
    process.exit(1);
  }
  bootstrapDatabase({ superuserUrl })
    .then(() => console.info("Database bootstrapped."))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
