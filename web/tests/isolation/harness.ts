import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

import { bootstrapDatabase } from "../../scripts/bootstrap-db";

export type IsolationDb = {
  container: StartedPostgreSqlContainer;
  ownerUrl: string;
  appUrl: string;
  maintenanceUrl: string;
  /** A fresh client as `app_runtime` — RLS-bound, no account context set. */
  appClient(): Promise<Client>;
  /** A fresh client as `mhandisi_owner`. */
  ownerClient(): Promise<Client>;
  stop(): Promise<void>;
};

/**
 * Boots a real PostgreSQL, applies the role split + every migration, and hands
 * back connection strings for each role. RLS does not exist in a mock, so the
 * isolation suite runs against this.
 */
export async function startIsolationDb(): Promise<IsolationDb> {
  const container = await new PostgreSqlContainer("postgres:16")
    .withDatabase("postgres")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();

  const host = container.getHost();
  const port = container.getFirstMappedPort();
  const superuserUrl = `postgresql://postgres:postgres@${host}:${port}/postgres`;

  await bootstrapDatabase({ superuserUrl });

  const ownerUrl = `postgresql://mhandisi_owner:owner_local_dev@${host}:${port}/mhandisi`;
  const appUrl = `postgresql://app_runtime:app_local_dev@${host}:${port}/mhandisi`;
  const maintenanceUrl = `postgresql://maintenance:maintenance_local_dev@${host}:${port}/mhandisi`;

  const ownerPool = new Pool({ connectionString: ownerUrl, max: 1 });
  try {
    await migrate(drizzle(ownerPool), { migrationsFolder: "./drizzle" });
  } finally {
    await ownerPool.end();
  }

  return {
    container,
    ownerUrl,
    appUrl,
    maintenanceUrl,
    async appClient() {
      const c = new Client({ connectionString: appUrl });
      await c.connect();
      return c;
    },
    async ownerClient() {
      const c = new Client({ connectionString: ownerUrl });
      await c.connect();
      return c;
    },
    async stop() {
      await container.stop();
    },
  };
}

/** Inserts an auth_user (as better-auth would) and returns its id + account id. */
export async function createUser(
  owner: Client,
  email: string,
): Promise<{ userId: string; accountId: string }> {
  const userId = `usr_${Math.random().toString(36).slice(2, 12)}`;
  await owner.query(
    `INSERT INTO auth_user (id, name, email, email_verified, phone)
     VALUES ($1, $2, $3, false, '+255700000000')`,
    [userId, `User ${email}`, email],
  );
  const { rows } = await owner.query<{ id: string }>(
    "SELECT id FROM accounts WHERE user_id = $1",
    [userId],
  );
  return { userId, accountId: rows[0]!.id };
}
