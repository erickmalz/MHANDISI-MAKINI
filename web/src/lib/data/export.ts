import "server-only";

import { eq } from "drizzle-orm";

import {
  accounts,
  auth_user,
  deliveryRecordLines,
  deliveryRecords,
  deposits,
  documentNumberSequences,
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

    const [
      projectRows,
      stageRows,
      supplierRows,
      subcontractorRows,
      taskRows,
      materialLineRows,
      fundingRequestRows,
      fundingRequestLineRows,
      feeInvoiceRows,
      depositRows,
      purchaseOrderRows,
      purchaseOrderLineRows,
      deliveryRecordRows,
      deliveryRecordLineRows,
      paymentRecordRows,
      labourPaymentRows,
      pettyCashExpenseRows,
      otherCommitmentRows,
      documentNumberSequenceRows,
    ] = await Promise.all([
      tx.select().from(projects),
      tx.select().from(stages),
      tx.select().from(suppliers),
      tx.select().from(subcontractors),
      tx.select().from(tasks),
      tx.select().from(materialLines),
      tx.select().from(fundingRequests),
      tx.select().from(fundingRequestLines),
      tx.select().from(feeInvoices),
      tx.select().from(deposits),
      tx.select().from(purchaseOrders),
      tx.select().from(purchaseOrderLines),
      tx.select().from(deliveryRecords),
      tx.select().from(deliveryRecordLines),
      tx.select().from(paymentRecords),
      tx.select().from(labourPayments),
      tx.select().from(pettyCashExpenses),
      tx.select().from(otherCommitments),
      tx.select().from(documentNumberSequences),
    ]);

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
      projects: projectRows,
      stages: stageRows,
      suppliers: supplierRows,
      subcontractors: subcontractorRows,
      tasks: taskRows,
      materialLines: materialLineRows,
      fundingRequests: fundingRequestRows,
      fundingRequestLines: fundingRequestLineRows,
      feeInvoices: feeInvoiceRows,
      deposits: depositRows,
      purchaseOrders: purchaseOrderRows,
      purchaseOrderLines: purchaseOrderLineRows,
      deliveryRecords: deliveryRecordRows,
      deliveryRecordLines: deliveryRecordLineRows,
      paymentRecords: paymentRecordRows,
      labourPayments: labourPaymentRows,
      pettyCashExpenses: pettyCashExpenseRows,
      otherCommitments: otherCommitmentRows,
      documentNumberSequences: documentNumberSequenceRows,
    };
  });
}
