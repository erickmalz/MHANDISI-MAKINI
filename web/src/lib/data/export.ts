import "server-only";

import { eq } from "drizzle-orm";

import {
  accounts,
  auth_user,
  deliveryRecordLines,
  deliveryRecords,
  deposits,
  documentNumberSequences,
  feeInvoicePayments,
  feeInvoices,
  fundingRequestLines,
  fundingRequests,
  labourPayments,
  materialLines,
  otherCommitments,
  paymentRecords,
  pettyCashExpenses,
  projects,
  purchaseOrderLines,
  purchaseOrders,
  stages,
  subcontractors,
  suppliers,
  tasks,
} from "./schema";
import { withAccount } from "./with-account";

/**
 * "Export my data" (Slice 2.8 Part 3 / ticket 02) — every row the Account
 * owns, as one JSON-serialisable object. Reused verbatim as step one of the
 * deletion flow (Part 4): the same function backs both the standalone
 * "Export my data" button and the export-before-delete step.
 *
 * Every table listed here is exactly the set the maintenance sweep (Part 4)
 * will hard-delete via the `auth_user` cascade — this module is the
 * authoritative "what does an Account own" list; keep it in sync with any
 * future account-scoped table.
 *
 * No `accountId` parameter, same as every other DAL read: `withAccount` sets
 * the tenant GUC and RLS scopes every one of these selects to the caller's
 * own rows. The logo's raw bytes are deliberately excluded (huge, and not
 * meaningful as JSON) — `profile.hasLogo` / `logoContentType` note whether one
 * is set; the bytes themselves are only ever served by `/settings/logo`.
 */

export interface AccountDataExport {
  exportedAt: string;
  profile: {
    fullName: string;
    phone: string;
    email: string;
    hasLogo: boolean;
    logoContentType: string | null;
    acceptedTermsVersion: string | null;
    acceptedTermsAt: string | null;
    createdAt: string;
  };
  projects: unknown[];
  stages: unknown[];
  suppliers: unknown[];
  subcontractors: unknown[];
  tasks: unknown[];
  materialLines: unknown[];
  fundingRequests: unknown[];
  fundingRequestLines: unknown[];
  feeInvoices: unknown[];
  feeInvoicePayments: unknown[];
  deposits: unknown[];
  purchaseOrders: unknown[];
  purchaseOrderLines: unknown[];
  deliveryRecords: unknown[];
  deliveryRecordLines: unknown[];
  paymentRecords: unknown[];
  labourPayments: unknown[];
  pettyCashExpenses: unknown[];
  otherCommitments: unknown[];
  documentNumberSequences: unknown[];
}

export async function exportAccountData(): Promise<AccountDataExport | null> {
  return withAccount(async (tx) => {
    const [profileRow] = await tx
      .select({
        fullName: accounts.fullName,
        phone: accounts.phone,
        email: auth_user.email,
        logoContentType: accounts.logoContentType,
        acceptedTermsVersion: accounts.acceptedTermsVersion,
        acceptedTermsAt: accounts.acceptedTermsAt,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .innerJoin(auth_user, eq(auth_user.id, accounts.userId))
      .limit(1);
    if (!profileRow) return null;

    // Sequential awaits, never Promise.all: every read shares the one Postgres
    // client behind `tx`, and node-postgres does not support overlapping
    // queries on one client (the bug fixed in activity.ts / project-closeout.ts).
    // Object-literal properties evaluate in source order, one await at a time.
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        fullName: profileRow.fullName,
        phone: profileRow.phone,
        email: profileRow.email,
        hasLogo: profileRow.logoContentType != null,
        logoContentType: profileRow.logoContentType,
        acceptedTermsVersion: profileRow.acceptedTermsVersion,
        acceptedTermsAt: profileRow.acceptedTermsAt?.toISOString() ?? null,
        createdAt: profileRow.createdAt.toISOString(),
      },
      projects: await tx.select().from(projects),
      stages: await tx.select().from(stages),
      suppliers: await tx.select().from(suppliers),
      subcontractors: await tx.select().from(subcontractors),
      tasks: await tx.select().from(tasks),
      materialLines: await tx.select().from(materialLines),
      fundingRequests: await tx.select().from(fundingRequests),
      fundingRequestLines: await tx.select().from(fundingRequestLines),
      feeInvoices: await tx.select().from(feeInvoices),
      feeInvoicePayments: await tx.select().from(feeInvoicePayments),
      deposits: await tx.select().from(deposits),
      purchaseOrders: await tx.select().from(purchaseOrders),
      purchaseOrderLines: await tx.select().from(purchaseOrderLines),
      deliveryRecords: await tx.select().from(deliveryRecords),
      deliveryRecordLines: await tx.select().from(deliveryRecordLines),
      paymentRecords: await tx.select().from(paymentRecords),
      labourPayments: await tx.select().from(labourPayments),
      pettyCashExpenses: await tx.select().from(pettyCashExpenses),
      otherCommitments: await tx.select().from(otherCommitments),
      documentNumberSequences: await tx.select().from(documentNumberSequences),
    };
  });
}
