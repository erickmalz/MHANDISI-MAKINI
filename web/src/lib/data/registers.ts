import "server-only";

import { asc, eq } from "drizzle-orm";

import type { Subcontractor, Supplier } from "@/lib/registers";
import type {
  SubcontractorInput,
  SupplierInput,
} from "@/lib/validation/registers";

import { getCurrentAccountId } from "./account-context";
import { subcontractors, suppliers } from "./schema";
import { withAccount } from "./with-account";

/**
 * The per-Account reference registers DAL (multi-tenancy ticket 08 §3) — the
 * Supplier Register (guidelines §25) and the Subcontractor Register (§26),
 * Slice 2.4b.
 *
 * No `accountId` in any signature: `withAccount` sets the tenant GUC and
 * Postgres RLS (`WITH CHECK`) is the backstop, so an insert only ever writes
 * the caller's own row and a cross-account update is a silent no-op — callers
 * read the returned-rows count and 404.
 *
 * These are plain directories reused across the Account's projects; a delete is
 * deliberately not offered (a Supplier / Subcontractor with history must stay
 * referenceable — a retired one is marked `inactive`, ticket 09 §6 / the loose
 * `supplier_id` / `subcontractor_id` columns).
 */

// --- Suppliers -------------------------------------------------------------

/** Every Supplier in the Account, active first then by name — the register list. */
export async function listSuppliers(): Promise<Supplier[]> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select()
      .from(suppliers)
      .orderBy(asc(suppliers.status), asc(suppliers.name));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      contactPerson: r.contactPerson,
      phone: r.phone,
      email: r.email,
      location: r.location,
      paymentTerms: r.paymentTerms,
      notes: r.notes,
      status: r.status,
    }));
  });
}

/** The editable fields of one Supplier, form-shaped, or `null` (missing / cross-account). */
export async function getSupplierInput(
  supplierId: string,
): Promise<(SupplierInput & { name: string }) | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    if (!row) return null;
    return {
      name: row.name,
      contactPerson: row.contactPerson ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      location: row.location ?? undefined,
      paymentTerms: row.paymentTerms ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status,
    };
  });
}

/** Create a Supplier and return its opaque id. */
export async function createSupplier(input: SupplierInput): Promise<string> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [row] = await tx
      .insert(suppliers)
      .values({
        accountId,
        name: input.name,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        location: input.location ?? null,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        status: input.status,
      })
      .returning({ id: suppliers.id });
    return row.id;
  });
}

/** Update a Supplier's editable fields. `false` when the id is missing / cross-account. */
export async function updateSupplier(
  supplierId: string,
  input: SupplierInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(suppliers)
      .set({
        name: input.name,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        location: input.location ?? null,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId))
      .returning({ id: suppliers.id });
    return res.length > 0;
  });
}

// --- Subcontractors ------------------------------------------------------

/** Every Subcontractor in the Account, active first then by name. */
export async function listSubcontractors(): Promise<Subcontractor[]> {
  return withAccount(async (tx) => {
    const rows = await tx
      .select()
      .from(subcontractors)
      .orderBy(asc(subcontractors.status), asc(subcontractors.name));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      trade: r.trade,
      phone: r.phone,
      email: r.email,
      address: r.address,
      notes: r.notes,
      status: r.status,
    }));
  });
}

/** The editable fields of one Subcontractor, form-shaped, or `null`. */
export async function getSubcontractorInput(
  subcontractorId: string,
): Promise<(SubcontractorInput & { name: string }) | null> {
  return withAccount(async (tx) => {
    const [row] = await tx
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);
    if (!row) return null;
    return {
      name: row.name,
      trade: row.trade ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status,
    };
  });
}

/** Create a Subcontractor and return its opaque id. */
export async function createSubcontractor(
  input: SubcontractorInput,
): Promise<string> {
  const accountId = await getCurrentAccountId();
  return withAccount(async (tx) => {
    const [row] = await tx
      .insert(subcontractors)
      .values({
        accountId,
        name: input.name,
        trade: input.trade ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        status: input.status,
      })
      .returning({ id: subcontractors.id });
    return row.id;
  });
}

/** Update a Subcontractor's editable fields. `false` when missing / cross-account. */
export async function updateSubcontractor(
  subcontractorId: string,
  input: SubcontractorInput,
): Promise<boolean> {
  return withAccount(async (tx) => {
    const res = await tx
      .update(subcontractors)
      .set({
        name: input.name,
        trade: input.trade ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(subcontractors.id, subcontractorId))
      .returning({ id: subcontractors.id });
    return res.length > 0;
  });
}
