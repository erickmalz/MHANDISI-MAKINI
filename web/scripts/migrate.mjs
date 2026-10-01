/**
 * Applies every migration in ./drizzle over the schema-owner connection
 * (`DATABASE_URL`). Used by `npm run db:migrate`, by CI, and as Fly's
 * `release_command`, which runs it in the shipped image before any new
 * machine starts, so new code never meets an un-migrated database. A failed
 * migration fails the release and the deploy stops there.
 *
 * Plain Node (no tsx) on purpose: the shipped image carries no TypeScript
 * toolchain, and WSL can't run this checkout's Windows-built esbuild.
 *
 * drizzle-kit generated migrations and the hand-authored custom ones
 * (RLS helpers, the account-provisioning trigger) are one ordered sequence
 * tracked in ./drizzle/meta/_journal.json.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Local `.env` for development and CI. `dotenv` is a dev dependency, and in
// production the secrets are already in the environment, so it's optional.
try {
  await import("dotenv/config");
} catch {
  // not installed — rely on the environment
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — cannot run migrations.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.info("Migrations applied.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
