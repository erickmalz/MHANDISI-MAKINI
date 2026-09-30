import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  aggregateStageFinancials,
  availableFloat,
  forecastFundingRequirement,
  materialVariance,
} from "@/lib/finance";
import * as schema from "@/lib/data/schema";
import {
  readProjectFinancials,
  readStageFinancials,
} from "@/lib/data/stage-financials";
import type { AccountTx } from "@/lib/data/with-account";
import type { StageFinancials } from "@/lib/types";

import { createUser, startIsolationDb, type IsolationDb } from "../isolation/harness";

/**
 * The Stage Financials read model (`.scratch/stage-financials/map.md`),
 * exercised through its own interface against a real PostgreSQL — the SQL is
 * the behaviour here, so there is nothing to mock. One Account's project is
 * seeded with every record kind the reads sum, including the rows they must
 * ignore (voided, cancelled, planned, superseded-but-still-counted, draft),
 * plus a second Account whose rows must stay invisible.
 *
 * Figures are chosen so every expected value can be checked by hand; the
 * arithmetic is spelled out beside each expectation.
 */

type Seeder = (text: string, params?: unknown[]) => Promise<string>;

/** Runs `fn` in one `app_runtime` transaction with the tenant GUC set, as the DAL does. */
async function asAccount<T>(app: Client, accountId: string, fn: (one: Seeder) => Promise<T>) {
  await app.query("BEGIN");
  await app.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
  try {
    const result = await fn(
      async (text, params = []) => (await app.query<{ id: string }>(text, params)).rows[0]?.id ?? "",
    );
    await app.query("COMMIT");
    return result;
  } catch (e) {
    await app.query("ROLLBACK");
    throw e;
  }
}

type Ids = { projectId: string; s1: string; s2: string; s3: string };

async function seedAccountA(app: Client, acc: string): Promise<Ids> {
  return asAccount(app, acc, async (one) => {
    const projectId = await one(
      `INSERT INTO projects (account_id, project_code, name, client_name, site)
       VALUES ($1, 'PRJ-A', 'A Residence', 'A Client', 'A Site') RETURNING id`,
      [acc],
    );
    const stage = (name: string, seq: number) =>
      one(
        `INSERT INTO stages (account_id, project_id, name, seq) VALUES ($1, $2, $3, $4) RETURNING id`,
        [acc, projectId, name, seq],
      );
    // Inserted out of seq order: reads must still come back in seq order.
    const s2 = await stage("Walling", 2);
    const s1 = await stage("Foundation", 1);
    const s3 = await stage("Roofing", 3);
    const supplierId = await one(
      `INSERT INTO suppliers (account_id, name) VALUES ($1, 'Depot') RETURNING id`,
      [acc],
    );

    const fr = (stageId: string, status: string, kind = "base", supersedesId: string | null = null) =>
      one(
        `INSERT INTO funding_requests (account_id, stage_id, kind, status, supersedes_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [acc, stageId, kind, status, supersedesId],
      );
    const frLine = (frId: string, category: string, amount: number) =>
      one(
        `INSERT INTO funding_request_lines (account_id, funding_request_id, category, seq, item, amount)
         VALUES ($1, $2, $3, 1, 'line', $4) RETURNING id`,
        [acc, frId, category, amount],
      );
    const deposit = (frId: string, amount: number, voided = false) =>
      one(
        `INSERT INTO deposits (account_id, funding_request_id, amount, received_on, method, voided_at)
         VALUES ($1, $2, $3, '2026-09-01', 'bank_transfer', $4) RETURNING id`,
        [acc, frId, amount, voided ? new Date() : null],
      );
    const feeInvoice = (
      stageId: string,
      frId: string,
      status: string,
      amount: number,
      n: number,
      originalAmount: number | null = null,
    ) =>
      one(
        `INSERT INTO fee_invoices (account_id, stage_id, funding_request_id, status, base_number,
                                   display_number, fee_basis, fee_amount, original_fee_amount,
                                   document_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, 'fixed', $7, $8, '{}'::jsonb) RETURNING id`,
        [acc, stageId, frId, status, n, `FI-A-${n}`, amount, originalAmount],
      );
    const feePayment = (feeInvoiceId: string, amount: number) =>
      one(
        `INSERT INTO fee_invoice_payments (account_id, fee_invoice_id, amount, received_on, method)
         VALUES ($1, $2, $3, '2026-09-03', 'mobile_money') RETURNING id`,
        [acc, feeInvoiceId, amount],
      );
    const po = async (stageId: string, status: string, qty: number, price: number) => {
      const id = await one(
        `INSERT INTO purchase_orders (account_id, stage_id, supplier_id, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [acc, stageId, supplierId, status],
      );
      await one(
        `INSERT INTO purchase_order_lines (account_id, purchase_order_id, seq, item, unit, qty_ordered, unit_price)
         VALUES ($1, $2, 1, 'Cement', 'bag', $3, $4) RETURNING id`,
        [acc, id, qty, price],
      );
      return id;
    };
    const poPayment = (poId: string, amount: number, voided = false) =>
      one(
        `INSERT INTO payment_records (account_id, purchase_order_id, paid_on, amount, method, voided_at)
         VALUES ($1, $2, '2026-09-02', $3, 'cash', $4) RETURNING id`,
        [acc, poId, amount, voided ? new Date() : null],
      );
    const task = (stageId: string, seq: number, original: number, revised: number | null) =>
      one(
        `INSERT INTO tasks (account_id, stage_id, description, seq, labour_original, labour_revised)
         VALUES ($1, $2, 'task', $3, $4, $5) RETURNING id`,
        [acc, stageId, seq, original, revised],
      );
    const labourPayment = (taskId: string, amount: number, voided = false) =>
      one(
        `INSERT INTO labour_payments (account_id, task_id, amount, paid_on, method, voided_at)
         VALUES ($1, $2, $3, '2026-09-03', 'mobile_money', $4) RETURNING id`,
        [acc, taskId, amount, voided ? new Date() : null],
      );
    const materialLine = (
      taskId: string,
      qtyOriginal: number,
      costOriginal: number,
      qtyRevised: number | null = null,
      costRevised: number | null = null,
    ) =>
      one(
        `INSERT INTO material_lines (account_id, task_id, item, unit, qty_original, est_unit_cost_original,
                                     qty_revised, est_unit_cost_revised)
         VALUES ($1, $2, 'item', 'unit', $3, $4, $5, $6) RETURNING id`,
        [acc, taskId, qtyOriginal, costOriginal, qtyRevised, costRevised],
      );
    const pettyCash = (stageId: string | null, amount: number, voided = false) =>
      one(
        `INSERT INTO petty_cash_expenses (account_id, project_id, stage_id, description, amount, spent_on, voided_at)
         VALUES ($1, $2, $3, 'petty', $4, '2026-09-04', $5) RETURNING id`,
        [acc, projectId, stageId, amount, voided ? new Date() : null],
      );
    const otherCommitment = (stageId: string, amount: number, voided = false) =>
      one(
        `INSERT INTO other_commitments (account_id, stage_id, description, amount, approved_on, voided_at)
         VALUES ($1, $2, 'other', $3, '2026-09-05', $4) RETURNING id`,
        [acc, stageId, amount, voided ? new Date() : null],
      );

    // --- Stage 1: every record kind, including the ones the read must skip.
    const fr1v1 = await fr(s1, "superseded");
    await frLine(fr1v1, "material", 2_000_000); // superseded: lines ignored
    await deposit(fr1v1, 1_000_000); // …but its deposit still counts
    const fr1v2 = await fr(s1, "issued", "base", fr1v1);
    await frLine(fr1v2, "material", 1_500_000);
    await frLine(fr1v2, "labour", 1_600_000);
    await frLine(fr1v2, "fee", 300_000);
    await deposit(fr1v2, 2_000_000);
    await deposit(fr1v2, 999, true);
    const fr1Draft = await fr(s1, "draft", "additional");
    await frLine(fr1Draft, "fee", 80_000); // Fee Recorded
    await frLine(fr1Draft, "material", 5_555); // draft: not scoped cost
    const fi1 = await feeInvoice(s1, fr1v2, "paid", 200_000, 1);
    await feePayment(fi1, 120_000);
    await feePayment(fi1, 80_000);
    // Part-paid: still `issued`, but what has come in counts as received.
    const fi2 = await feeInvoice(s1, fr1v2, "issued", 100_000, 2);
    await feePayment(fi2, 30_000);

    const po1 = await po(s1, "ordered", 10, 50_000); // 500,000
    await poPayment(po1, 200_000);
    await poPayment(po1, 100_000, true);
    const po2 = await po(s1, "closed", 6, 50_000); // 300,000
    await poPayment(po2, 280_000);
    await po(s1, "cancelled", 1, 999_000);
    await po(s1, "planned", 1, 777_000);
    const po5 = await po(s1, "ordered", 1, 100_000); // overpaid
    await poPayment(po5, 150_000);

    const t1 = await task(s1, 1, 1_000_000, 1_200_000);
    await labourPayment(t1, 500_000);
    await labourPayment(t1, 300_000, true);
    const t2 = await task(s1, 2, 400_000, null);
    await labourPayment(t2, 450_000); // overpaid
    await materialLine(t1, 100, 10_000, 120, null); // revised qty only: 1,200,000 (orig 1,000,000)
    await materialLine(t1, 10, 5_000); // 50,000
    await materialLine(t2, 1, -30_000); // a negative Variation-style impact

    await pettyCash(s1, 40_000);
    await pettyCash(s1, 10_000, true);
    await pettyCash(null, 5_000); // project-level: no stage's figure
    await otherCommitment(s1, 60_000);
    await otherCommitment(s1, 1_000, true);

    // --- Stage 2: over-funded (a surplus stage).
    const fr2 = await fr(s2, "issued");
    await frLine(fr2, "material", 500_000);
    await frLine(fr2, "fee", 50_000);
    await deposit(fr2, 900_000);
    // Billed at 50,000, then corrected down to 40,000.
    await feeInvoice(s2, fr2, "issued", 40_000, 3, 50_000);

    // --- Stage 3: issued, deposit still pending (Blue).
    const fr3 = await fr(s3, "issued");
    await frLine(fr3, "material", 100_000);
    await frLine(fr3, "fee", 70_000);
    // Raised in error and voided.
    await feeInvoice(s3, fr3, "void", 70_000, 4);

    return { projectId, s1, s2, s3 };
  });
}

describe("Stage Financials read model", () => {
  let db: IsolationDb;
  let owner: Client;
  let app: Client;
  let pool: Pool;
  let accountA: string;
  let accountB: string;
  let ids: Ids;
  let idsB: Ids;

  /** Calls the module exactly as the DAL does: inside one RLS-scoped transaction. */
  function read<T>(accountId: string, fn: (tx: AccountTx) => Promise<T>): Promise<T> {
    const appDb = drizzle(pool, { schema });
    return appDb.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_account_id', ${accountId}, true)`);
      return fn(tx as unknown as AccountTx);
    });
  }

  beforeAll(async () => {
    db = await startIsolationDb();
    owner = await db.ownerClient();
    app = await db.appClient();
    pool = new Pool({ connectionString: db.appUrl, max: 2 });
    accountA = (await createUser(owner, "a@example.com")).accountId;
    accountB = (await createUser(owner, "b@example.com")).accountId;
    ids = await seedAccountA(app, accountA);
    idsB = await seedAccountA(app, accountB);
  });

  afterAll(async () => {
    await pool.end();
    await app.end();
    await owner.end();
    await db.stop();
  });

  it("reads a stage's figures from every record kind, skipping voided, cancelled, planned and draft rows", async () => {
    const f = await read(accountA, (tx) => readStageFinancials(tx, ids.s1));

    expect(f).toEqual<StageFinancials>({
      clientDeposits: 3_000_000, // 1,000,000 on superseded v1 + 2,000,000 on v2
      openPurchaseCommitments: 300_000, // PO1 500,000 − 200,000; PO5 overpaid floors at 0
      paidPurchases: 630_000, // 200,000 + 280,000 (closed) + 150,000
      openLabourCommitments: 700_000, // T1 1,200,000 − 500,000; T2 overpaid floors at 0
      labourPayments: 950_000, // 500,000 + 450,000
      labourAgreementTotal: 1_600_000, // revised 1,200,000 + original 400,000
      materialEstimated: 1_220_000, // 1,200,000 + 50,000 − 30,000
      materialEstimatedOriginal: 1_020_000, // 1,000,000 + 50,000 − 30,000
      pettyCashExpenses: 40_000,
      otherApprovedCommitments: 60_000,
      remainingMaterial: 570_000, // 1,500,000 − 300,000 − 630,000
      remainingLabour: 0, // 1,600,000 − 700,000 − 950,000 < 0, floored
      remainingFee: 0, // 300,000 − 300,000 invoiced
      remainingOtherApproved: 0,
      feeRecorded: 80_000, // the draft request's fee line
      feeInvoiced: 300_000, // paid 200,000 + part-paid 100,000
      feeReceived: 230_000, // paid 120,000 + 80,000; part-paid 30,000
      fundingRequestPending: false,
    });
    // 3,000,000 − 300,000 − 630,000 − 700,000 − 950,000 − 40,000 − 60,000
    expect(availableFloat(f)).toBe(320_000);
    expect(forecastFundingRequirement(f)).toBe(250_000);
  });

  it("flags a stage whose issued Funding Request has no deposit yet", async () => {
    const f = await read(accountA, (tx) => readStageFinancials(tx, ids.s3));
    expect(f.fundingRequestPending).toBe(true);
    expect(f.remainingMaterial).toBe(100_000);
    expect(availableFloat(f)).toBe(0);
  });

  it("drops a voided Fee Invoice from the fee owed without re-reading its fee as still to bill", async () => {
    const f = await read(accountA, (tx) => readStageFinancials(tx, ids.s3));
    expect(f.feeInvoiced).toBe(0);
    expect(f.feeReceived).toBe(0);
    expect(f.remainingFee).toBe(0); // 70,000 on the request − 70,000 billed then voided
  });

  it("counts a corrected Fee Invoice at its corrected amount", async () => {
    const f = await read(accountA, (tx) => readStageFinancials(tx, ids.s2));
    expect(f.feeInvoiced).toBe(40_000);
    expect(f.remainingFee).toBe(0); // 50,000 on the request − 50,000 first billed
  });

  it("returns every stage of the project in seq order, each equal to its own stage read", async () => {
    const { byStage } = await read(accountA, (tx) => readProjectFinancials(tx, ids.projectId));
    expect([...byStage.keys()]).toEqual([ids.s1, ids.s2, ids.s3]);
    for (const [stageId, f] of byStage) {
      expect(f).toEqual(await read(accountA, (tx) => readStageFinancials(tx, stageId)));
    }
  });

  it("rolls the project up once: linear figures sum, the shortfall never nets a surplus stage", async () => {
    const { byStage, totals } = await read(accountA, (tx) =>
      readProjectFinancials(tx, ids.projectId),
    );

    expect(totals.clientDeposits).toBe(3_900_000); // 3,000,000 + 900,000 + 0
    expect(totals.fundingRequestPending).toBe(true); // stage 3
    expect(availableFloat(totals)).toBe(1_220_000); // 320,000 + 900,000 + 0
    // Accumulated Material Variance: 1,220,000 estimated − 630,000 paid.
    expect(materialVariance(totals)).toBe(590_000);

    // Summed totals would say "adequate" (1,170,000 − 1,220,000 < 0) …
    expect(forecastFundingRequirement(totals)).toBe(-50_000);
    // … but stage 2's surplus can't fund stages 1 and 3: 250,000 + 100,000.
    expect(aggregateStageFinancials([...byStage.values()]).forecastShortfall).toBe(350_000);
  });

  it("never sees another Account's rows", async () => {
    const other = await read(accountA, (tx) => readStageFinancials(tx, idsB.s1));
    expect(other.clientDeposits).toBe(0);
    expect(other.paidPurchases).toBe(0);
    expect(other.materialEstimated).toBe(0);

    const { byStage } = await read(accountA, (tx) => readProjectFinancials(tx, idsB.projectId));
    expect(byStage.size).toBe(0);

    // Account B's own read of the identical graph matches A's.
    const own = await read(accountB, (tx) => readStageFinancials(tx, idsB.s1));
    expect(own.clientDeposits).toBe(3_000_000);
  });
});
