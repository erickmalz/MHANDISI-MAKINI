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
  superuserUrl: string;
  /** A fresh client as `app_runtime` — RLS-bound, no account context set. */
  appClient(): Promise<Client>;
  /** A fresh client as `mhandisi_owner`. */
  ownerClient(): Promise<Client>;
  /**
   * A fresh client as the bootstrap superuser. Used only to test constraints
   * beneath RLS (`SET row_security = off`) — never a path the app has.
   */
  superuserClient(): Promise<Client>;
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
  const bootstrapUrl = `postgresql://postgres:postgres@${host}:${port}/postgres`;

  await bootstrapDatabase({ superuserUrl: bootstrapUrl });

  // Superuser, but connected to the application database — for constraint tests
  // that need to sit beneath RLS (`SET row_security = off`).
  const superuserUrl = `postgresql://postgres:postgres@${host}:${port}/mhandisi`;
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
    superuserUrl,
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
    async superuserClient() {
      const c = new Client({ connectionString: superuserUrl });
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

export type ProjectGraph = {
  projectId: string;
  stageId: string;
  taskId: string;
  materialLineId: string;
  supplierId: string;
  subcontractorId: string;
};

/**
 * Inserts a full structure graph for one account, through `app_runtime` with
 * the tenant GUC set — the same path the DAL will use, so it exercises the
 * `WITH CHECK` side of every policy. `tag` disambiguates the two accounts'
 * rows in a test.
 */
export async function seedProjectGraph(
  app: Client,
  accountId: string,
  tag: string,
): Promise<ProjectGraph> {
  await app.query("BEGIN");
  await app.query("SELECT set_config('app.current_account_id', $1, true)", [
    accountId,
  ]);
  const one = async (text: string, params: unknown[]) =>
    (await app.query<{ id: string }>(text, params)).rows[0]!.id;

  const projectId = await one(
    `INSERT INTO projects (account_id, project_code, name, client_name, site)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [accountId, `PRJ-${tag}-001`, `${tag} Residence`, `${tag} Client`, `${tag} Site`],
  );
  const stageId = await one(
    `INSERT INTO stages (account_id, project_id, name, seq)
     VALUES ($1, $2, 'Foundation', 1) RETURNING id`,
    [accountId, projectId],
  );
  const taskId = await one(
    `INSERT INTO tasks (account_id, stage_id, description, seq)
     VALUES ($1, $2, 'Excavation & footings', 1) RETURNING id`,
    [accountId, stageId],
  );
  const materialLineId = await one(
    `INSERT INTO material_lines (account_id, task_id, item, unit, qty_original, est_unit_cost_original)
     VALUES ($1, $2, 'Cement', 'bag', 200, 25000) RETURNING id`,
    [accountId, taskId],
  );
  const supplierId = await one(
    `INSERT INTO suppliers (account_id, name) VALUES ($1, $2) RETURNING id`,
    [accountId, `${tag} Cement Depot`],
  );
  const subcontractorId = await one(
    `INSERT INTO subcontractors (account_id, name, trade) VALUES ($1, $2, 'Groundworks') RETURNING id`,
    [accountId, `${tag} Crew`],
  );
  await app.query("COMMIT");

  return {
    projectId,
    stageId,
    taskId,
    materialLineId,
    supplierId,
    subcontractorId,
  };
}
