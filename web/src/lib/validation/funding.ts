import { z } from "zod";

/**
 * Input validation for the Funding Request write DAL (Slice 2.5). Isomorphic
 * (no `server-only`): the Server Action parses `FormData` with these and the
 * schemas double as the field contract the builder / forms follow.
 *
 * Enum literals here must match the Drizzle `pgEnum` values exactly
 * (`src/lib/data/schema/{funding-requests,funding-request-lines,enums}.ts`).
 *
 * The line rows are managed client-side and posted as one JSON string in a
 * hidden `lines` field — `linesSchema` parses that payload.
 */

const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

/** A whole-shilling amount (TZS has no minor unit in this app). */
const wholeAmount = z.coerce
  .number({ error: "Enter an amount." })
  .int({ error: "Enter a whole number of shillings." })
  .positive({ error: "Enter an amount greater than zero." });

const optWholeAmount = z.preprocess(emptyToUndefined, wholeAmount.optional());
const optQty = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter a quantity." })
    .positive({ error: "Enter a quantity greater than zero." })
    .optional(),
);

/**
 * One Funding Request line, as the builder posts it. A `material` line is
 * quantified (`qty` × `unitCost`); `labour` and `other` lines are lump sums.
 * `amount` is always sent (the builder computes it) and re-derived server-side
 * for a quantified line.
 */
export const fundingLineSchema = z
  .object({
    category: z.enum(["material", "labour", "other"]),
    item: z
      .string()
      .trim()
      .min(2, { error: "Name this line." })
      .max(160, { error: "That description is too long." }),
    description: optText(300),
    qty: optQty,
    unit: optText(24),
    unitCost: optWholeAmount,
    amount: wholeAmount,
  })
  .transform((line) => {
    if (line.category === "material" && line.qty != null && line.unitCost != null) {
      return { ...line, amount: Math.round(line.qty * line.unitCost) };
    }
    return line;
  });

export type FundingLineInput = z.infer<typeof fundingLineSchema>;

export const linesSchema = z
  .array(fundingLineSchema)
  .min(1, { error: "Add at least one material or labour line." })
  .max(200, { error: "That is more lines than a single request can carry." });

/** The editable body of a Draft Funding Request. */
export const fundingRequestDraftSchema = z.object({
  notes: optText(2000),
  paymentInstructions: optText(2000),
  lines: linesSchema,
});

export type FundingRequestDraftInput = z.infer<typeof fundingRequestDraftSchema>;

/** Recording a Deposit against an Issued request (ticket 09 §1). */
export const depositSchema = z.object({
  amount: wholeAmount,
  receivedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter the date it was received." }),
  method: z.enum(["bank_transfer", "cash", "mobile_money", "cheque", "other"]),
  reference: optText(120),
  notes: optText(500),
});

export type DepositInput = z.infer<typeof depositSchema>;

/** Forking a superseding version — a recorded reason is required (ticket 09 §1). */
export const supersedeSchema = z.object({
  revisionReason: z
    .string()
    .trim()
    .min(4, { error: "Say why this request is being revised." })
    .max(500, { error: "Keep the reason short." }),
});

export type SupersedeInput = z.infer<typeof supersedeSchema>;

/** Voiding a Deposit, or cancelling a Draft/Issued request. */
export const voidReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, { error: "Give a reason." })
    .max(500, { error: "Keep the reason short." }),
});

export type VoidReasonInput = z.infer<typeof voidReasonSchema>;

/** Correcting an unpaid Fee Invoice's amount — a recorded reason is required. */
export const feeInvoiceCorrectionSchema = z.object({
  amount: wholeAmount,
  reason: z
    .string()
    .trim()
    .min(4, { error: "Say why the amount is being corrected." })
    .max(500, { error: "Keep the reason short." }),
});

export type FeeInvoiceCorrectionInput = z.infer<typeof feeInvoiceCorrectionSchema>;

/** Recording a full or part payment against an Issued Fee Invoice. */
export const feeInvoicePaymentSchema = z.object({
  amount: wholeAmount,
  receivedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter the date it was received." }),
  method: z.enum(["bank_transfer", "cash", "mobile_money", "cheque", "other"]),
  reference: optText(120),
});

export type FeeInvoicePaymentInput = z.infer<typeof feeInvoicePaymentSchema>;
