import { z } from "zod";

/**
 * Input validation for the per-Account reference registers (Slice 2.4b) — the
 * Supplier Register (guidelines §25) and the Subcontractor Register (§26).
 * Isomorphic (no `server-only`): the Server Action parses `FormData` with these
 * and the schemas double as the field contract the forms follow.
 *
 * Enum literals here must match the Drizzle `pgEnum` values exactly
 * (`party_status` in `src/lib/data/schema/enums.ts`).
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optEmail = z.preprocess(
  emptyToUndefined,
  z.email({ error: "Enter a valid email address." }).toLowerCase().optional(),
);

const optPhone = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(20, { error: "That phone number looks too long." })
    .regex(/^[+()\d][\d\s()-]{5,}$/, { error: "Enter a valid phone number." })
    .optional(),
);

/** `active | inactive` — an inactive register row is kept for history but hidden from pickers. */
const partyStatus = z.enum(["active", "inactive"]).default("active");

export const supplierInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter the supplier's name." })
    .max(160, { error: "That name is too long." }),
  contactPerson: optText(120),
  phone: optPhone,
  email: optEmail,
  location: optText(200),
  paymentTerms: optText(200),
  notes: optText(2000),
  status: partyStatus,
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;

export const subcontractorInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter the subcontractor's name." })
    .max(160, { error: "That name is too long." }),
  trade: optText(120),
  phone: optPhone,
  email: optEmail,
  address: optText(200),
  notes: optText(2000),
  status: partyStatus,
});

export type SubcontractorInput = z.infer<typeof subcontractorInputSchema>;
