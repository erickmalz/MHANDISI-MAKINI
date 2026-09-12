/**
 * One-off dev fixture for Slice 2.7's outstanding manual smoke check
 * ("download all six documents for a project with an issued FR + Fee
 * Invoice + issued PO") — see `.scratch/phase2/slice-2.7-runbook.md` /
 * `.scratch/phase2/status.md`.
 *
 * This is a **developer QA tool, not a product feature** — it does not run
 * as part of the app and never touches a real Engineer's account. It exists
 * because "every Account starts completely empty, nothing is seeded" is a
 * hard product rule for real signups; this script only ever creates a new,
 * clearly-labelled throwaway test account for the person running it by hand.
 *
 * Seeds up to (and including) two **Drafts** — a Funding Request and a
 * Purchase Order, each with one line — through the same `app_runtime` + RLS
 * path the DAL uses (mirrors `tests/isolation/harness.ts`'s `createUser` /
 * `seedProjectGraph`), then stops. It deliberately does **not** fabricate the
 * "Issued" state itself: that requires an exact `document_snapshot` shape
 * only the real `issueFundingRequest` / `issuePurchaseOrder` transactions
 * produce, and issuing is the one click the smoke check actually wants to
 * exercise. So: run this, sign in, open the Funding Request and the
 * Purchase Order, click "Issue" on each, then download all six PDF/JPG
 * links.
 *
 * Run: `npx tsx scripts/seed-document-smoke-test.ts` (Windows-side — needs
 * `@node-rs/argon2`'s native binding and a real Postgres, neither available
 * under WSL in this repo's setup).
 */
import "dotenv/config";

import { pathToFileURL } from "node:url";

import { Client } from "pg";

import { hashPassword } from "../src/lib/auth/argon2";

const TEST_PASSWORD = "SmokeTest#12345";

export interface SeedResult {
  email: string;
  password: string;
  projectName: string;
  stageName: string;
}

export async function seedDocumentSmokeTest(
  ownerUrl: string,
  appUrl: string,
): Promise<SeedResult> {
  const tag = Date.now().toString(36);
  const email = `smoke-test-${tag}@example.invalid`;
  const userId = `usr_smoke_${tag}`;

  const owner = new Client({ connectionString: ownerUrl });
  await owner.connect();
  let accountId: string;
  try {
    // Mirrors better-auth's own signup writes (auth_user + the credential
    // auth_account row) — the app.provision_account trigger (migration 0001)
    // fires on the auth_user insert regardless of which role performs it, so
    // the matching `accounts` row is created atomically, same as a real signup.
    await owner.query(
      `INSERT INTO auth_user (id, name, email, email_verified, phone)
       VALUES ($1, $2, $3, true, '+255700000000')`,
      [userId, "Smoke Test Engineer", email],
    );
    const passwordHash = await hashPassword(TEST_PASSWORD);
    await owner.query(
      `INSERT INTO auth_account (id, account_id, provider_id, user_id, password)
       VALUES ($1, $2, 'credential', $3, $4)`,
      [`acc_smoke_${tag}`, userId, userId, passwordHash],
    );
    const { rows } = await owner.query<{ id: string }>(
      "SELECT id FROM accounts WHERE user_id = $1",
      [userId],
    );
    accountId = rows[0]!.id;
  } finally {
    await owner.end();
  }

  const app = new Client({ connectionString: appUrl });
  await app.connect();
  const projectName = `Smoke Test ${tag}`;
  const stageName = "Foundation";
  try {
    await app.query("BEGIN");
    await app.query("SELECT set_config('app.current_account_id', $1, true)", [
      accountId,
    ]);
    const one = async (text: string, params: unknown[]) =>
      (await app.query<{ id: string }>(text, params)).rows[0]!.id;

    const projectId = await one(
      `INSERT INTO projects (account_id, project_code, name, client_name, site)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [accountId, `PRJ-SMOKE-${tag}`, projectName, "Smoke Test Client", "Test Site, Dar es Salaam"],
    );
    const stageId = await one(
      `INSERT INTO stages (account_id, project_id, name, seq, fee_basis, fee_amount)
       VALUES ($1, $2, $3, 1, 'fixed', 500000) RETURNING id`,
      [accountId, projectId, stageName],
    );
    await app.query("UPDATE projects SET current_stage_id = $1 WHERE id = $2", [
      stageId,
      projectId,
    ]);
    const supplierId = await one(
      `INSERT INTO suppliers (account_id, name, payment_terms) VALUES ($1, $2, 'Net 30') RETURNING id`,
      [accountId, "Smoke Test Supplier Ltd"],
    );

    const frId = await one(
      `INSERT INTO funding_requests (account_id, stage_id)
       VALUES ($1, $2) RETURNING id`,
      [accountId, stageId],
    );
    await app.query(
      `INSERT INTO funding_request_lines
         (account_id, funding_request_id, category, seq, item, qty, unit, unit_cost, amount)
       VALUES ($1, $2, 'material', 1, 'Cement', 100, 'bag', 25000, 2500000)`,
      [accountId, frId],
    );

    const poId = await one(
      `INSERT INTO purchase_orders (account_id, stage_id, supplier_id, payment_terms)
       VALUES ($1, $2, $3, 'Net 30') RETURNING id`,
      [accountId, stageId, supplierId],
    );
    await app.query(
      `INSERT INTO purchase_order_lines
         (account_id, purchase_order_id, seq, item, unit, qty_ordered, unit_price)
       VALUES ($1, $2, 1, 'Cement', 'bag', 100, 25000)`,
      [accountId, poId],
    );

    await app.query("COMMIT");
  } catch (err) {
    await app.query("ROLLBACK");
    throw err;
  } finally {
    await app.end();
  }

  return { email, password: TEST_PASSWORD, projectName, stageName };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ownerUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!ownerUrl || !appUrl) {
    console.error("DATABASE_URL and APP_DATABASE_URL must both be set.");
    process.exit(1);
  }
  seedDocumentSmokeTest(ownerUrl, appUrl)
    .then((result) => {
      console.info("\nSmoke-test fixture created:\n");
      console.info(`  Sign in at /sign-in with:`);
      console.info(`    Email:    ${result.email}`);
      console.info(`    Password: ${result.password}`);
      console.info(`\n  Then open "${result.projectName}" -> "${result.stageName}":`);
      console.info(`    - Funding tab: open the one draft Funding Request, click`);
      console.info(`      "Issue", then download the FR PDF/JPG and the Fee`);
      console.info(`      Invoice PDF/JPG it raises.`);
      console.info(`    - Procurement tab: open the one draft Purchase Order,`);
      console.info(`      click "Issue", then download its PDF/JPG.\n`);
      console.info("  This is a throwaway test account — safe to leave or delete afterward.\n");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
