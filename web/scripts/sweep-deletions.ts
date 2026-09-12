/**
 * The maintenance-role deletion sweep (Slice 2.8 Part 4 / ticket 02) — hard-
 * deletes every Account whose 30-day grace period has passed.
 *
 * Connects as `maintenance` (BYPASSRLS, session-less — see
 * `docker/postgres/init/00-roles.sql`) via `MAINTENANCE_DATABASE_URL`, never
 * the app's `APP_DATABASE_URL` pool. One `DELETE FROM auth_user` per
 * candidate cascades through `accounts`, `auth_session`, `auth_account` and
 * every account-scoped domain table (`accounts.id` is the root of every FK
 * chain — see `@/lib/data/export.ts`'s table list for the full set that
 * disappears). This is exactly why migration `0005` grants `maintenance`
 * `DELETE` on `auth_user` and `SELECT` on it (join target below) — it had
 * neither before.
 *
 * The "deletion completed" email (ticket 02 email #4b) is sent **before**
 * the delete: the address doesn't exist to read afterward.
 *
 * Run manually: `npx tsx scripts/sweep-deletions.ts`. How this gets
 * scheduled (cron, a CI workflow_dispatch, a container sidecar) is a
 * deployment-shape decision not yet made — out of scope here beyond making
 * the script itself runnable on demand.
 */
import "dotenv/config";

import { pathToFileURL } from "node:url";

import { Client } from "pg";

import { sendDeletionCompletedEmail } from "../src/lib/auth/emails";

const GRACE_PERIOD_DAYS = 30;

interface Candidate {
  userId: string;
  email: string;
}

export async function sweepExpiredDeletions(connectionString: string): Promise<number> {
  const client = new Client({ connectionString });
  await client.connect();

  let deleted = 0;
  try {
    const { rows } = await client.query<Candidate>(
      `SELECT au.id AS "userId", au.email AS email
       FROM auth_user au
       JOIN accounts a ON a.user_id = au.id
       WHERE a.deletion_scheduled_at IS NOT NULL
         AND a.deletion_scheduled_at < now() - interval '${GRACE_PERIOD_DAYS} days'`,
    );

    for (const candidate of rows) {
      await sendDeletionCompletedEmail(candidate.email);
      await client.query("DELETE FROM auth_user WHERE id = $1", [candidate.userId]);
      deleted += 1;
    }
  } finally {
    await client.end();
  }
  return deleted;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const connectionString = process.env.MAINTENANCE_DATABASE_URL;
  if (!connectionString) {
    console.error("MAINTENANCE_DATABASE_URL is not set.");
    process.exit(1);
  }
  sweepExpiredDeletions(connectionString)
    .then((count) => console.info(`Deletion sweep complete — ${count} account(s) removed.`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
