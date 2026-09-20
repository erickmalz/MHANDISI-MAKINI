import { z } from "zod";

/**
 * Input validation for the Labour Payment write DAL (`recordLabourPayment` /
 * `voidLabourPayment` in `@/lib/data/tasks`). Isomorphic (no `server-only`):
 * the Server Action parses `FormData` with these.
 *
 * `method` must match the shared `payment_method` pgEnum
 * (`src/lib/data/schema/enums.ts`) exactly.
 */

const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." });

/** A whole-shilling amount (TZS has no minor unit in this app). */
const wholeAmount = z.coerce
  .number({ error: "Enter an amount." })
  .int({ error: "Enter a whole number of shillings." })
  .positive({ error: "Enter an amount greater than zero." });

export const labourPaymentSchema = z.object({
  paidOn: isoDate,
  amount: wholeAmount,
  method: z.enum(["bank_transfer", "cash", "mobile_money", "cheque", "other"]),
  reference: optText(120),
  notes: optText(500),
});

export type LabourPaymentInput = z.infer<typeof labourPaymentSchema>;

/** Voiding a Labour Payment — a recorded reason is required. */
export const voidReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, { error: "Give a reason." })
    .max(500, { error: "Keep the reason short." }),
});

export type VoidReasonInput = z.infer<typeof voidReasonSchema>;
