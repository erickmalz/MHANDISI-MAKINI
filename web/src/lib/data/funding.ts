import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import {
  type FundingRequest,
  type FundingRequestLine,
  type PaymentMethod,
  materialSubtotal,
  labourSubtotal,
} from "@/lib/funding";
import type {
  DepositInput,
  FundingLineInput,
  FundingRequestDraftInput,
  SupersedeInput,
} from "@/lib/validation/funding";

import { getCurrentAccountId } from "./account-context";
import { claimDocumentNumber, pad3 } from "./document-numbers";
import {
  deposits,
  feeInvoices,
  fundingRequestLines,
  fundingRequests,
  projects,
  stages,
} from "./schema";
import type { DocumentSnapshot, DocumentSnapshotSection } from "./schema/snapshot";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The Funding Request DAL (multi-tenancy ticket 08 §3, state machine ticket 09
 * §1) — Slice 2.5.
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert only ever writes
 * the caller's own row and a cross-account update is a silent no-op — callers
 * read the returned-rows count and 404 / no-op.
 *
 * "Issue" is the single atomic line between editable and immutable: it freezes
 * the lines, mints `FR-{project}-NNN`, appends the stage's `fee` line, mints
 * `FI-{project}-NNN` and raises the Fee Invoice. After Issue the only writes are
 * appends (Deposits) or a controlled Supersede — never an in-place edit.
 */

const PAYMENT_METHOD_LABELS: Record<string, PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

const iso = (v: Date | string | null): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : v;

/** `FR-PRJ-2026-001-004`, plus ` v2` from version 2 on. */
function frDisplayNumber(projectCode: string, base: number, version: number): string {
  const stem = `FR-${projectCode}-${pad3(base)}`;
  return version > 1 ? `${stem} v${version}` : stem;
}

// --- View-model assembly (shared by list + get) --------------------------

const frSelection = {
  id: fundingRequests.id,
  kind: fundingRequests.kind,
  status: fundingRequests.status,
  version: fundingRequests.version,
  baseNumber: fundingRequests.baseNumber,
  displayNumber: fundingRequests.displayNumber,
  supersedesId: fundingRequests.supersedesId,
  revisionReason: fundingRequests.revisionReason,
  cancelReason: fundingRequests.cancelReason,
  notes: fundingRequests.notes,
  paymentInstructions: fundingRequests.paymentInstructions,
  issuedAt: fundingRequests.issuedAt,
  stageId: fundingRequests.stageId,
  stageName: stages.name,
  projectId: stages.projectId,
  projectCode: projects.projectCode,
  projectName: projects.name,
  clientName: projects.clientName,
  site: projects.site,
} as const;

type FrRow = {
  id: string;
  kind: FundingRequest["kind"];
  status: FundingRequest["status"];
  version: number;
  baseNumber: number | null;
  displayNumber: string | null;
  supersedesId: string | null;
  revisionReason: string | null;
  cancelReason: string | null;
  notes: string | null;
  paymentInstructions: string | null;
  issuedAt: Date | string | null;
  stageId: string;
  stageName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  site: string;
};

async function assemble(
  tx: AccountTx,
  frRows: FrRow[],
): Promise<FundingRequest[]> {
  if (frRows.length === 0) return [];
  const frIds = frRows.map((r) => r.id);

  const lineRows = await tx
    .select()
    .from(fundingRequestLines)
    .where(inArray(fundingRequestLines.fundingRequestId, frIds))
    .orderBy(asc(fundingRequestLines.seq));

  const depositRows = await tx
    .select()
    .from(deposits)
    .where(inArray(deposits.fundingRequestId, frIds))
    .orderBy(asc(deposits.receivedOn));

  const feeRows = await tx
    .select({
      id: feeInvoices.id,
      fundingRequestId: feeInvoices.fundingRequestId,
      displayNumber: feeInvoices.displayNumber,
      status: feeInvoices.status,
      feeAmount: feeInvoices.feeAmount,
      isDelta: feeInvoices.isDelta,
    })
    .from(feeInvoices)
    .where(inArray(feeInvoices.fundingRequestId, frIds));

  // Resolve the frozen number of each request's predecessor / successor.
  const supersedesIds = frRows
    .map((r) => r.supersedesId)
    .filter((v): v is string => v != null);
  const chainRows =
    supersedesIds.length || frIds.length
      ? await tx
          .select({
            id: fundingRequests.id,
            displayNumber: fundingRequests.displayNumber,
            supersedesId: fundingRequests.supersedesId,
          })
          .from(fundingRequests)
          .where(
            inArray(fundingRequests.id, [...new Set([...supersedesIds, ...frIds])]),
          )
      : [];
  const numberById = new Map(chainRows.map((r) => [r.id, r.displayNumber]));
  const successorByPredecessor = new Map(
    chainRows
      .filter((r) => r.supersedesId != null)
      .map((r) => [r.supersedesId as string, r.displayNumber]),
  );

  const linesByFr = new Map<string, FundingRequestLine[]>();
  for (const l of lineRows) {
    const list = linesByFr.get(l.fundingRequestId) ?? [];
    list.push({
      id: l.id,
      category: l.category,
      seq: l.seq,
      item: l.item,
      description: l.description,
      qty: l.qty != null ? Number(l.qty) : null,
      unit: l.unit,
      unitCost: l.unitCost,
      amount: l.amount,
    });
    linesByFr.set(l.fundingRequestId, list);
  }

  const depositsByFr = new Map<string, FundingRequest["deposits"]>();
  for (const d of depositRows) {
    const list = depositsByFr.get(d.fundingRequestId) ?? [];
    list.push({
      id: d.id,
      amount: d.amount,
      receivedOn: d.receivedOn,
      method: PAYMENT_METHOD_LABELS[d.method] ?? "Other",
      reference: d.reference,
      notes: d.notes,
      voidedAt: iso(d.voidedAt),
      voidReason: d.voidReason,
    });
    depositsByFr.set(d.fundingRequestId, list);
  }

  const feeByFr = new Map<string, FundingRequest["feeInvoice"]>();
  for (const f of feeRows) {
    // A request can carry at most one direct Fee Invoice; a delta invoice is
    // attached to the version whose Issue raised it.
    feeByFr.set(f.fundingRequestId, {
      id: f.id,
      displayNumber: f.displayNumber,
      status: f.status,
      feeAmount: f.feeAmount,
      isDelta: f.isDelta,
    });
  }

  return frRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    version: r.version,
    baseNumber: r.baseNumber,
    displayNumber: r.displayNumber,
    projectId: r.projectId,
    projectCode: r.projectCode,
    projectName: r.projectName,
    stageId: r.stageId,
    stageName: r.stageName,
    clientName: r.clientName,
    site: r.site,
    supersedesId: r.supersedesId,
    supersedesDisplayNumber: r.supersedesId
      ? (numberById.get(r.supersedesId) ?? null)
      : null,
    supersededByDisplayNumber: successorByPredecessor.get(r.id) ?? null,
    revisionReason: r.revisionReason,
    cancelReason: r.cancelReason,
    notes: r.notes,
    paymentInstructions: r.paymentInstructions,
    issuedAt: iso(r.issuedAt),
    lines: linesByFr.get(r.id) ?? [],
    deposits: depositsByFr.get(r.id) ?? [],
    feeInvoice: feeByFr.get(r.id) ?? null,
  }));
}

/** Every Funding Request for a project, oldest first — the funding list. */
export async function listFundingRequests(
  projectId: string,
): Promise<FundingRequest[]> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(frSelection)
      .from(fundingRequests)
      .innerJoin(stages, eq(stages.id, fundingRequests.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(fundingRequests.createdAt))) as FrRow[];
    return assemble(tx, rows);
  });
}

/** One Funding Request by opaque id, or `null` (missing or cross-account). */
export async function getFundingRequest(
  frId: string,
): Promise<FundingRequest | null> {
  return withAccount(async (tx) => {
    const rows = (await tx
      .select(frSelection)
      .from(fundingRequests)
      .innerJoin(stages, eq(stages.id, fundingRequests.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(fundingRequests.id, frId))
      .limit(1)) as FrRow[];
    const [fr] = await assemble(tx, rows);
    return fr ?? null;
  });
}

// --- Draft create / edit ------------------------------------------------

async function insertLines(
  tx: AccountTx,
  accountId: string,
  fundingRequestId: string,
  lines: FundingLineInput[],
  startSeq = 1,
): Promise<void> {
  if (lines.length === 0) return;
  await tx.insert(fundingRequestLines).values(
    lines.map((line, i) => ({
      accountId,
      fundingRequestId,
      category: line.category,
      seq: startSeq + i,
      item: line.item,
      description: line.description ?? null,
      qty: line.qty != null ? String(line.qty) : null,
      unit: line.unit ?? null,
      unitCost: line.unitCost ?? null,
      amount: line.amount,
    })),
  );
}

/**
 * Create a Draft Funding Request under a stage. `kind` is `base` for the
 * stage's original request or `additional` for approved scope growth (ticket
 * 09 §1 — an Additional Funding Request is never a version). Returns the new
 * request id, or `null` when the stage is missing / cross-account.
 */
export async function createFundingRequestDraft(
  stageId: string,
  kind: "base" | "additional",
  input: FundingRequestDraftInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [stage] = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage) return null;

    const [row] = await tx
      .insert(fundingRequests)
      .values({
        accountId,
        stageId,
        kind,
        status: "draft",
        version: 1,
        notes: input.notes ?? null,
        paymentInstructions: input.paymentInstructions ?? null,
      })
      .returning({ id: fundingRequests.id });

    await insertLines(tx, accountId, row.id, input.lines);
    return row.id;
  });
}

/** The editable body of a Draft, form-shaped, or `null` (missing / not a draft). */
export async function getFundingRequestDraftInput(frId: string): Promise<
  | {
      projectId: string;
      stageId: string;
      stageName: string;
      kind: "base" | "additional";
      notes: string | undefined;
      paymentInstructions: string | undefined;
      lines: FundingRequestLine[];
    }
  | null
> {
  return withAccount(async (tx) => {
    const [row] = (await tx
      .select({
        id: fundingRequests.id,
        status: fundingRequests.status,
        kind: fundingRequests.kind,
        notes: fundingRequests.notes,
        paymentInstructions: fundingRequests.paymentInstructions,
        stageId: fundingRequests.stageId,
        stageName: stages.name,
        projectId: stages.projectId,
      })
      .from(fundingRequests)
      .innerJoin(stages, eq(stages.id, fundingRequests.stageId))
      .where(eq(fundingRequests.id, frId))
      .limit(1)) as {
      id: string;
      status: FundingRequest["status"];
      kind: "base" | "additional";
      notes: string | null;
      paymentInstructions: string | null;
      stageId: string;
      stageName: string;
      projectId: string;
    }[];
    if (!row || row.status !== "draft") return null;

    const lineRows = await tx
      .select()
      .from(fundingRequestLines)
      .where(eq(fundingRequestLines.fundingRequestId, frId))
      .orderBy(asc(fundingRequestLines.seq));

    return {
      projectId: row.projectId,
      stageId: row.stageId,
      stageName: row.stageName,
      kind: row.kind,
      notes: row.notes ?? undefined,
      paymentInstructions: row.paymentInstructions ?? undefined,
      lines: lineRows.map((l) => ({
        id: l.id,
        category: l.category,
        seq: l.seq,
        item: l.item,
        description: l.description,
        qty: l.qty != null ? Number(l.qty) : null,
        unit: l.unit,
        unitCost: l.unitCost,
        amount: l.amount,
      })),
    };
  });
}

/**
 * Replace a Draft's body. Lines are deleted and re-inserted — a Draft is freely
 * editable and there is nothing downstream of a draft line. `false` when the id
 * is missing, cross-account, or no longer a draft.
 */
export async function updateFundingRequestDraft(
  frId: string,
  input: FundingRequestDraftInput,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({ status: fundingRequests.status })
      .from(fundingRequests)
      .where(eq(fundingRequests.id, frId))
      .limit(1);
    if (!row || row.status !== "draft") return false;

    await tx
      .update(fundingRequests)
      .set({
        notes: input.notes ?? null,
        paymentInstructions: input.paymentInstructions ?? null,
        updatedAt: new Date(),
      })
      .where(eq(fundingRequests.id, frId));

    await tx
      .delete(fundingRequestLines)
      .where(eq(fundingRequestLines.fundingRequestId, frId));
    await insertLines(tx, accountId, frId, input.lines);
    return true;
  });
}

/** Discard a Draft (cascades its lines). `false` when missing / not a draft. */
export async function deleteFundingRequestDraft(frId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .delete(fundingRequests)
      .where(
        and(eq(fundingRequests.id, frId), eq(fundingRequests.status, "draft")),
      )
      .returning({ id: fundingRequests.id });
    return res.length > 0;
  });
}

// --- Snapshots ---------------------------------------------------------

function linesToSection(
  title: string,
  lines: FundingRequestLine[],
): DocumentSnapshotSection | null {
  if (lines.length === 0) return null;
  return {
    title,
    lines: lines.map((l) => ({
      label: l.item,
      description: l.description ?? undefined,
      qty: l.qty != null ? String(l.qty) : undefined,
      unit: l.unit ?? undefined,
      unitCost: l.unitCost ?? undefined,
      amount: l.amount,
    })),
    subtotal: lines.reduce((sum, l) => sum + l.amount, 0),
  };
}

function buildFundingRequestSnapshot(args: {
  displayNumber: string;
  issuedOn: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  site: string;
  stageName: string;
  lines: FundingRequestLine[];
  feeAmount: number;
  notes: string | null;
  paymentInstructions: string | null;
  supersedes: { displayNumber: string; reason: string } | null;
}): DocumentSnapshot {
  const material = args.lines.filter((l) => l.category === "material");
  const labour = args.lines.filter((l) => l.category === "labour");
  const other = args.lines.filter((l) => l.category === "other");

  const sections: DocumentSnapshotSection[] = [];
  const push = (s: DocumentSnapshotSection | null) => {
    if (s) sections.push(s);
  };
  push(linesToSection("Materials", material));
  push(linesToSection("Labour", labour));
  push(linesToSection("Other", other));
  sections.push({
    title: "Supervision fee (billed separately via Fee Invoice)",
    lines: [{ label: "Supervision fee for this stage", amount: args.feeAmount }],
    subtotal: args.feeAmount,
  });

  const target =
    material.reduce((s, l) => s + l.amount, 0) +
    labour.reduce((s, l) => s + l.amount, 0) +
    other.reduce((s, l) => s + l.amount, 0);

  return {
    kind: "funding_request",
    displayNumber: args.displayNumber,
    issuedOn: args.issuedOn,
    projectName: args.projectName,
    projectCode: args.projectCode,
    counterpartyName: args.clientName,
    site: args.site,
    stageName: args.stageName,
    sections,
    total: target,
    notes: args.notes ?? undefined,
    paymentInstructions: args.paymentInstructions ?? undefined,
    supersedes: args.supersedes ?? undefined,
  };
}

function buildFeeInvoiceSnapshot(args: {
  displayNumber: string;
  issuedOn: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  site: string;
  stageName: string;
  feeBasis: "fixed" | "percent";
  feePercent: number | null;
  basisValue: number | null;
  feeAmount: number;
  paymentInstructions: string | null;
}): DocumentSnapshot {
  const how =
    args.feeBasis === "percent" && args.feePercent != null
      ? `${args.feePercent}% of the stage material + labour scope`
      : "Fixed supervision fee for this stage";
  return {
    kind: "fee_invoice",
    displayNumber: args.displayNumber,
    issuedOn: args.issuedOn,
    projectName: args.projectName,
    projectCode: args.projectCode,
    counterpartyName: args.clientName,
    site: args.site,
    stageName: args.stageName,
    sections: [
      {
        title: "Supervision fee",
        lines: [
          {
            label: how,
            description:
              args.basisValue != null
                ? `Basis value ${args.basisValue.toLocaleString("en-US")}`
                : undefined,
            amount: args.feeAmount,
          },
        ],
        subtotal: args.feeAmount,
      },
    ],
    total: args.feeAmount,
    paymentInstructions: args.paymentInstructions ?? undefined,
  };
}

// --- Issue -----------------------------------------------------------

export type IssueResult =
  | { ok: true; displayNumber: string }
  | {
      ok: false;
      reason: "not-found" | "not-draft" | "no-lines" | "fee-basis-missing";
    };

type StageFeeConfig = {
  feeBasis: "fixed" | "percent" | null;
  feeAmount: number | null;
  feePercent: string | null;
};

function computeFee(stage: StageFeeConfig, basisValue: number): number | null {
  if (stage.feeBasis === "fixed") {
    return stage.feeAmount != null ? stage.feeAmount : null;
  }
  if (stage.feeBasis === "percent") {
    return stage.feePercent != null
      ? Math.round((Number(stage.feePercent) / 100) * basisValue)
      : null;
  }
  return null;
}

/**
 * The atomic Issue transaction (ticket 09 §1). Freezes the lines, mints the FR
 * number, appends the `fee` line, mints the FI number and raises the Fee
 * Invoice, sets `issued_at`. When this request supersedes a predecessor, that
 * predecessor moves to `superseded` and its Fee Invoice is handled per §1
 * (unpaid → reissued onto this version; paid → a positive delta invoice).
 */
export async function issueFundingRequest(frId: string): Promise<IssueResult> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [fr] = (await tx
      .select({
        id: fundingRequests.id,
        status: fundingRequests.status,
        kind: fundingRequests.kind,
        version: fundingRequests.version,
        baseNumber: fundingRequests.baseNumber,
        supersedesId: fundingRequests.supersedesId,
        revisionReason: fundingRequests.revisionReason,
        notes: fundingRequests.notes,
        paymentInstructions: fundingRequests.paymentInstructions,
        stageId: fundingRequests.stageId,
        stageName: stages.name,
        feeBasis: stages.feeBasis,
        feeAmount: stages.feeAmount,
        feePercent: stages.feePercent,
        projectId: stages.projectId,
        projectCode: projects.projectCode,
        projectName: projects.name,
        clientName: projects.clientName,
        site: projects.site,
      })
      .from(fundingRequests)
      .innerJoin(stages, eq(stages.id, fundingRequests.stageId))
      .innerJoin(projects, eq(projects.id, stages.projectId))
      .where(eq(fundingRequests.id, frId))
      .limit(1)) as {
      id: string;
      status: FundingRequest["status"];
      kind: "base" | "additional";
      version: number;
      baseNumber: number | null;
      supersedesId: string | null;
      revisionReason: string | null;
      notes: string | null;
      paymentInstructions: string | null;
      stageId: string;
      stageName: string;
      feeBasis: "fixed" | "percent" | null;
      feeAmount: number | null;
      feePercent: string | null;
      projectId: string;
      projectCode: string;
      projectName: string;
      clientName: string;
      site: string;
    }[];

    if (!fr) return { ok: false as const, reason: "not-found" as const };
    if (fr.status !== "draft") return { ok: false as const, reason: "not-draft" as const };

    const draftLines = await tx
      .select()
      .from(fundingRequestLines)
      .where(eq(fundingRequestLines.fundingRequestId, frId))
      .orderBy(asc(fundingRequestLines.seq));
    const scopeLines = draftLines.filter((l) => l.category !== "fee");
    if (scopeLines.length === 0)
      return { ok: false as const, reason: "no-lines" as const };

    const asView: FundingRequestLine[] = scopeLines.map((l) => ({
      id: l.id,
      category: l.category,
      seq: l.seq,
      item: l.item,
      description: l.description,
      qty: l.qty != null ? Number(l.qty) : null,
      unit: l.unit,
      unitCost: l.unitCost,
      amount: l.amount,
    }));
    const basisValue =
      materialSubtotal({ lines: asView }) + labourSubtotal({ lines: asView });

    const fee = computeFee(
      { feeBasis: fr.feeBasis, feeAmount: fr.feeAmount, feePercent: fr.feePercent },
      basisValue,
    );
    if (fee == null || fr.feeBasis == null)
      return { ok: false as const, reason: "fee-basis-missing" as const };
    const feeBasis: "fixed" | "percent" = fr.feeBasis;

    // Base number: reuse the predecessor's for a superseding version, else claim
    // the next per-project Funding Request number.
    const base =
      fr.supersedesId != null && fr.baseNumber != null
        ? fr.baseNumber
        : await claimDocumentNumber(tx, accountId, fr.projectId, "funding_request");
    const displayNumber = frDisplayNumber(fr.projectCode, base, fr.version);
    const issuedOn = new Date().toISOString().slice(0, 10);

    // Freeze: append the fee line, then snapshot.
    const nextSeq = (draftLines.at(-1)?.seq ?? 0) + 1;
    await tx.insert(fundingRequestLines).values({
      accountId,
      fundingRequestId: frId,
      category: "fee",
      seq: nextSeq,
      item: "Supervision fee for this stage",
      description: "Billed separately through the Fee Invoice.",
      amount: fee,
    });
    const feeLine: FundingRequestLine = {
      id: "fee",
      category: "fee",
      seq: nextSeq,
      item: "Supervision fee for this stage",
      description: "Billed separately through the Fee Invoice.",
      qty: null,
      unit: null,
      unitCost: null,
      amount: fee,
    };

    const supersedesNumber = fr.supersedesId
      ? ((
          await tx
            .select({ n: fundingRequests.displayNumber })
            .from(fundingRequests)
            .where(eq(fundingRequests.id, fr.supersedesId))
            .limit(1)
        )[0]?.n ?? null)
      : null;

    const snapshot = buildFundingRequestSnapshot({
      displayNumber,
      issuedOn,
      projectName: fr.projectName,
      projectCode: fr.projectCode,
      clientName: fr.clientName,
      site: fr.site,
      stageName: fr.stageName,
      lines: [...asView, feeLine],
      feeAmount: fee,
      notes: fr.notes,
      paymentInstructions: fr.paymentInstructions,
      supersedes:
        fr.supersedesId && supersedesNumber
          ? {
              displayNumber: supersedesNumber,
              reason: fr.revisionReason ?? "Revised",
            }
          : null,
    });

    await tx
      .update(fundingRequests)
      .set({
        status: "issued",
        baseNumber: base,
        displayNumber,
        documentSnapshot: snapshot,
        issuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fundingRequests.id, frId));

    // --- Fee Invoice --------------------------------------------------
    const feeInvoiceSnapshot = (fiNumber: string) =>
      buildFeeInvoiceSnapshot({
        displayNumber: fiNumber,
        issuedOn,
        projectName: fr.projectName,
        projectCode: fr.projectCode,
        clientName: fr.clientName,
        site: fr.site,
        stageName: fr.stageName,
        feeBasis,
        feePercent: fr.feePercent != null ? Number(fr.feePercent) : null,
        basisValue,
        feeAmount: fee,
        paymentInstructions: fr.paymentInstructions,
      });

    let priorFee:
      | { id: string; status: "issued" | "paid"; feeAmount: number; baseNumber: number; displayNumber: string }
      | undefined;
    if (fr.supersedesId) {
      [priorFee] = await tx
        .select({
          id: feeInvoices.id,
          status: feeInvoices.status,
          feeAmount: feeInvoices.feeAmount,
          baseNumber: feeInvoices.baseNumber,
          displayNumber: feeInvoices.displayNumber,
        })
        .from(feeInvoices)
        .where(
          and(
            eq(feeInvoices.fundingRequestId, fr.supersedesId),
            eq(feeInvoices.isDelta, false),
          ),
        )
        .orderBy(desc(feeInvoices.createdAt))
        .limit(1);

      await tx
        .update(fundingRequests)
        .set({ status: "superseded", supersededAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(fundingRequests.id, fr.supersedesId),
            eq(fundingRequests.status, "issued"),
          ),
        );
    }

    if (priorFee && priorFee.status === "issued") {
      // Unpaid predecessor invoice — reissue it onto this version (§1). Number
      // and row id are kept; nothing was paid, so no double-count.
      await tx
        .update(feeInvoices)
        .set({
          fundingRequestId: frId,
          feeBasis,
          feePercent: fr.feePercent,
          basisValue,
          feeAmount: fee,
          paymentInstructions: fr.paymentInstructions ?? null,
          documentSnapshot: feeInvoiceSnapshot(priorFee.displayNumber),
          issuedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(feeInvoices.id, priorFee.id));
    } else if (priorFee && priorFee.status === "paid") {
      // Paid predecessor — never touched. Raise a delta invoice for the increase.
      const delta = fee - priorFee.feeAmount;
      if (delta > 0) {
        const fiSeq = await claimDocumentNumber(
          tx,
          accountId,
          fr.projectId,
          "fee_invoice",
        );
        const fiNumber = `FI-${fr.projectCode}-${pad3(fiSeq)}`;
        await tx.insert(feeInvoices).values({
          accountId,
          stageId: fr.stageId,
          fundingRequestId: frId,
          status: "issued",
          baseNumber: fiSeq,
          displayNumber: fiNumber,
          isDelta: true,
          parentFeeInvoiceId: priorFee.id,
          feeBasis,
          feePercent: fr.feePercent,
          basisValue,
          feeAmount: delta,
          paymentInstructions: fr.paymentInstructions ?? null,
          documentSnapshot: feeInvoiceSnapshot(fiNumber),
        });
      }
    } else {
      // Fresh Fee Invoice for a first issue or an additional request.
      const fiSeq = await claimDocumentNumber(
        tx,
        accountId,
        fr.projectId,
        "fee_invoice",
      );
      const fiNumber = `FI-${fr.projectCode}-${pad3(fiSeq)}`;
      await tx.insert(feeInvoices).values({
        accountId,
        stageId: fr.stageId,
        fundingRequestId: frId,
        status: "issued",
        baseNumber: fiSeq,
        displayNumber: fiNumber,
        feeBasis,
        feePercent: fr.feePercent,
        basisValue,
        feeAmount: fee,
        paymentInstructions: fr.paymentInstructions ?? null,
        documentSnapshot: feeInvoiceSnapshot(fiNumber),
      });
    }

    return { ok: true as const, displayNumber };
  });
}

// --- Supersede ------------------------------------------------------

/**
 * Fork a superseding version off an Issued request (ticket 09 §1). The new row
 * is a Draft — `version + 1`, `supersedes_id` → the prior request, the recorded
 * reason — carrying the prior request's scope lines to be corrected. The prior
 * request stays `issued` until the fork is itself Issued. Returns the new draft
 * id, or `null` when the source is missing / not an Issued request.
 */
export async function supersedeFundingRequest(
  frId: string,
  input: SupersedeInput,
): Promise<string | null> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [fr] = await tx
      .select({
        id: fundingRequests.id,
        status: fundingRequests.status,
        kind: fundingRequests.kind,
        version: fundingRequests.version,
        baseNumber: fundingRequests.baseNumber,
        stageId: fundingRequests.stageId,
        notes: fundingRequests.notes,
        paymentInstructions: fundingRequests.paymentInstructions,
      })
      .from(fundingRequests)
      .where(eq(fundingRequests.id, frId))
      .limit(1);
    if (!fr || fr.status !== "issued") return null;

    // Only the current tip of a chain can be superseded.
    const [existingFork] = await tx
      .select({ id: fundingRequests.id })
      .from(fundingRequests)
      .where(eq(fundingRequests.supersedesId, frId))
      .limit(1);
    if (existingFork) return null;

    const [row] = await tx
      .insert(fundingRequests)
      .values({
        accountId,
        stageId: fr.stageId,
        kind: fr.kind,
        status: "draft",
        version: fr.version + 1,
        baseNumber: fr.baseNumber,
        supersedesId: frId,
        revisionReason: input.revisionReason,
        notes: fr.notes,
        paymentInstructions: fr.paymentInstructions,
      })
      .returning({ id: fundingRequests.id });

    const priorScopeLines = await tx
      .select()
      .from(fundingRequestLines)
      .where(
        and(
          eq(fundingRequestLines.fundingRequestId, frId),
          inArray(fundingRequestLines.category, ["material", "labour", "other"]),
        ),
      )
      .orderBy(asc(fundingRequestLines.seq));

    if (priorScopeLines.length > 0) {
      await tx.insert(fundingRequestLines).values(
        priorScopeLines.map((l) => ({
          accountId,
          fundingRequestId: row.id,
          category: l.category,
          seq: l.seq,
          item: l.item,
          description: l.description,
          qty: l.qty,
          unit: l.unit,
          unitCost: l.unitCost,
          amount: l.amount,
        })),
      );
    }

    return row.id;
  });
}

// --- Deposits ------------------------------------------------------

/** Record a client Deposit against an Issued request. `false` when not issuable-against. */
export async function recordDeposit(
  frId: string,
  input: DepositInput,
): Promise<boolean> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [fr] = await tx
      .select({ status: fundingRequests.status })
      .from(fundingRequests)
      .where(eq(fundingRequests.id, frId))
      .limit(1);
    // Deposits recorded against a version that is later superseded still count
    // (ticket 09 §1), so `superseded` is allowed here too — only a draft is not.
    if (!fr || !["issued", "superseded", "closed"].includes(fr.status)) {
      return false;
    }

    await tx.insert(deposits).values({
      accountId,
      fundingRequestId: frId,
      amount: input.amount,
      receivedOn: input.receivedOn,
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    });
    return true;
  });
}

/** Void a Deposit (append-only with reversal, ticket 09 §1). `false` when missing. */
export async function voidDeposit(
  frId: string,
  depositId: string,
  reason: string,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(deposits)
      .set({ voidedAt: new Date(), voidReason: reason, updatedAt: new Date() })
      .where(
        and(
          eq(deposits.id, depositId),
          eq(deposits.fundingRequestId, frId),
          sql`${deposits.voidedAt} IS NULL`,
        ),
      )
      .returning({ id: deposits.id });
    return res.length > 0;
  });
}

/** Mark an Issued Fee Invoice paid. `false` when missing / already paid. */
export async function markFeeInvoicePaid(feeInvoiceId: string): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(feeInvoices)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(feeInvoices.id, feeInvoiceId),
          eq(feeInvoices.status, "issued"),
        ),
      )
      .returning({ id: feeInvoices.id });
    return res.length > 0;
  });
}
