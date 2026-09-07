/**
 * Applies every migration in ./drizzle over the schema-owner connection
 * (`DATABASE_URL`). Used by `npm run db:migrate` and by CI.
 *
 * drizzle-kit generated migrations and the hand-authored custom ones
 * (RLS helpers, the account-provisioning trigger) are one ordered sequence
 * tracked in ./drizzle/meta/_journal.json.
 */
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot run migrations.");
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.info("Migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
