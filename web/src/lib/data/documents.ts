import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { formatDate } from "@/lib/format";

import {
  accounts,
  auth_user,
  feeInvoices,
  fundingRequests,
  purchaseOrders,
  stages,
} from "./schema";
import type {
  FeeInvoiceSnapshot,
  FundingRequestSnapshot,
  PurchaseOrderSnapshot,
} from "./schema/snapshot";
import { withAccount, type AccountTx } from "./with-account";

/**
 * The read side for document rendering (multi-tenancy ticket 10 / ADR 0005) —
 * Slice 2.7.
 *
 * Each getter returns the frozen `document_snapshot` plus two things the
 * snapshot deliberately does not carry:
 *
 *  - **`profile`** — the Engineer's current business name, phone, email and
 *    letterhead logo. A corrected phone/logo is the Engineer representing
 *    themselves, not a term of a past deal, so it renders live (ticket 10
 *    §3), sourced from the Slice 2.8 profile edit at `/settings`.
 *  - **`stamp`** — the diagonal lifecycle stamp (`SUPERSEDED` / `CANCELLED` /
 *    `PAID — {date}`). It reflects the record's state *now*, which changes after
 *    Issue, so it is derived here from the live row, never frozen.
 *
 * `withAccount` + RLS scope every read; a cross-account or missing id resolves
 * to `null` and the route handler answers 404.
 */

export interface DocumentProfile {
  /** The Engineer's business / trading name — always present (`accounts.full_name`). */
  businessName: string;
  /** Their contact phone — always present (`accounts.phone`). */
  phone: string;
  /** The Account's sign-in email (`auth_user.email`) — read-only on the letterhead. */
  email: string;
  /**
   * The letterhead logo as an inline `data:` URI, or `null` when none is set.
   * Documents render via Puppeteer from a static HTML string with no asset
   * server (ticket 10's "rendered on demand, never stored" principle), so the
   * bytes are inlined here rather than a URL Chromium would have to fetch.
   */
  logoDataUrl: string | null;
}

export interface FundingRequestDocument {
  kind: "funding_request";
  projectId: string;
  snapshot: FundingRequestSnapshot;
  stamp: string | null;
  profile: DocumentProfile;
}

export interface FeeInvoiceDocument {
  kind: "fee_invoice";
  projectId: string;
  snapshot: FeeInvoiceSnapshot;
  stamp: string | null;
  profile: DocumentProfile;
}

export interface PurchaseOrderDocument {
  kind: "purchase_order";
  projectId: string;
  snapshot: PurchaseOrderSnapshot;
  stamp: string | null;
  profile: DocumentProfile;
}

/** Any of the three — the templates narrow on `snapshot.kind`. */
export type DocumentInput =
  | FundingRequestDocument
  | FeeInvoiceDocument
  | PurchaseOrderDocument;

async function readProfile(tx: AccountTx): Promise<DocumentProfile | null> {
  const [row] = await tx
    .select({
      businessName: accounts.fullName,
      phone: accounts.phone,
      email: auth_user.email,
      logo: accounts.logo,
      logoContentType: accounts.logoContentType,
    })
    .from(accounts)
    .innerJoin(auth_user, eq(auth_user.id, accounts.userId))
    .limit(1);
  if (!row) return null;
  return {
    businessName: row.businessName,
    phone: row.phone,
    email: row.email,
    logoDataUrl:
      row.logo && row.logoContentType
        ? `data:${row.logoContentType};base64,${row.logo.toString("base64")}`
        : null,
  };
}

/** The Engineer's letterhead identity, or `null` when unauthenticated. */
export async function getDocumentProfile(): Promise<DocumentProfile | null> {
  return withAccount(readProfile);
}

/** An Issued Funding Request's render inputs, or `null` (missing / draft / cross-account). */
export async function getFundingRequestDocument(
  frId: string,
): Promise<FundingRequestDocument | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        status: fundingRequests.status,
        documentSnapshot: fundingRequests.documentSnapshot,
        projectId: stages.projectId,
      })
      .from(fundingRequests)
      .innerJoin(stages, eq(stages.id, fundingRequests.stageId))
      .where(eq(fundingRequests.id, frId))
      .limit(1);
    if (!row || !row.documentSnapshot) return null;

    const profile = await readProfile(tx);
    if (!profile) return null;

    const stamp =
      row.status === "superseded"
        ? "SUPERSEDED"
        : row.status === "cancelled"
          ? "CANCELLED"
          : null;

    return {
      kind: "funding_request",
      projectId: row.projectId,
      snapshot: row.documentSnapshot as FundingRequestSnapshot,
      stamp,
      profile,
    };
  });
}

/**
 * The Fee Invoice raised for a Funding Request version, or `null`. Prefers the
 * primary invoice; falls back to a delta follow-up when that is all there is for
 * the version.
 */
export async function getFeeInvoiceDocument(
  frId: string,
): Promise<FeeInvoiceDocument | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        status: feeInvoices.status,
        paidAt: feeInvoices.paidAt,
        supersededAt: feeInvoices.supersededAt,
        documentSnapshot: feeInvoices.documentSnapshot,
        projectId: stages.projectId,
      })
      .from(feeInvoices)
      .innerJoin(stages, eq(stages.id, feeInvoices.stageId))
      .where(eq(feeInvoices.fundingRequestId, frId))
      .orderBy(asc(feeInvoices.isDelta), desc(feeInvoices.createdAt))
      .limit(1);
    if (!row) return null;

    const profile = await readProfile(tx);
    if (!profile) return null;

    const stamp =
      row.status === "paid"
        ? `PAID — ${formatDate(row.paidAt ?? new Date())}`
        : row.supersededAt != null
          ? "SUPERSEDED"
          : null;

    return {
      kind: "fee_invoice",
      projectId: row.projectId,
      snapshot: row.documentSnapshot as FeeInvoiceSnapshot,
      stamp,
      profile,
    };
  });
}

/** An Issued Purchase Order's render inputs, or `null` (missing / planned / cross-account). */
export async function getPurchaseOrderDocument(
  poId: string,
): Promise<PurchaseOrderDocument | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select({
        status: purchaseOrders.status,
        documentSnapshot: purchaseOrders.documentSnapshot,
        projectId: stages.projectId,
      })
      .from(purchaseOrders)
      .innerJoin(stages, eq(stages.id, purchaseOrders.stageId))
      .where(eq(purchaseOrders.id, poId))
      .limit(1);
    if (!row || !row.documentSnapshot) return null;

    const profile = await readProfile(tx);
    if (!profile) return null;

    const stamp = row.status === "cancelled" ? "CANCELLED" : null;

    return {
      kind: "purchase_order",
      projectId: row.projectId,
      snapshot: row.documentSnapshot as PurchaseOrderSnapshot,
      stamp,
      profile,
    };
  });
}
