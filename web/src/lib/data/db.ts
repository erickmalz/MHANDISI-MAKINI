import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * The Next.js runtime connection pool — connects as the non-owner `app_runtime`
 * role (ADR 0001). Every account-scoped read and write goes through
 * `withAccount()` (../with-account.ts), which opens a transaction and issues
 * `SET LOCAL app.current_account_id` before touching a domain table; Postgres
 * row-level security is the backstop beneath that.
 *
 * One long-lived pool: the app is a single long-running container, so there is
 * no serverless connection-churn to design around.
 */
const globalForPool = globalThis as unknown as { __mmPool?: Pool };

const pool =
  globalForPool.__mmPool ??
  new Pool({
    connectionString: process.env.APP_DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPool.__mmPool = pool;

export const db = drizzle(pool, { schema });
export { pool };
