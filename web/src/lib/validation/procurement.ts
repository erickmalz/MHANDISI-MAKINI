import { z } from "zod";

/**
 * Input validation for the Purchase Order write DAL (Slice 2.6). Isomorphic
 * (no `server-only`): the Server Action parses `FormData` with these and the
 * schemas double as the field contract the builder / forms follow.
 *
 * Enum literals here must match the Drizzle `pgEnum` values exactly
 * (`src/lib/data/schema/{purchase-orders,payment-records,enums}.ts`).
 *
 * The line rows (and a delivery's per-line quantities) are managed client-side
 * and posted as one JSON string in a hidden field — `poLinesSchema` /
 * `deliveryLinesSchema` parse those payloads.
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." });

const optDate = z.preprocess(emptyToUndefined, isoDate.optional());

/** A whole-shilling amount (TZS has no minor unit in this app). */
const wholeAmount = z.coerce
  .number({ error: "Enter an amount." })
  .int({ error: "Enter a whole number of shillings." })
  .positive({ error: "Enter an amount greater than zero." });

/** A non-negative quantity — deliveries can record a zero-quantity line. */
const nonNegQty = z.coerce
  .number({ error: "Enter a quantity." })
  .nonnegative({ error: "A quantity cannot be negative." });

// --- Draft header + material lines ---------------------------------------

/** One material line on a Purchase Order, as the builder posts it (guidelines §22). */
export const poLineSchema = z.object({
  item: z
    .string()
    .trim()
    .min(2, { error: "Name this line." })
    .max(160, { error: "That description is too long." }),
  description: optText(300),
  unit: z
    .string()
    .trim()
    .min(1, { error: "Enter a unit (bag, ton, piece…)." })
    .max(24, { error: "That unit label is too long." }),
  qtyOrdered: z.coerce
    .number({ error: "Enter a quantity." })
    .positive({ error: "Enter a quantity greater than zero." }),
  unitPrice: wholeAmount,
});

export type POLineInput = z.infer<typeof poLineSchema>;

export const poLinesSchema = z
  .array(poLineSchema)
  .min(1, { error: "Add at least one material line." })
  .max(200, { error: "That is more lines than a single order can carry." });

/** The editable body of a Draft (planned) Purchase Order. */
export const purchaseOrderDraftSchema = z.object({
  supplierId: z.uuid({ error: "Choose a supplier from the register." }),
  expectedDeliveryOn: optDate,
  paymentTerms: optText(300),
  notes: optText(2000),
  lines: poLinesSchema,
});

export type PurchaseOrderDraftInput = z.infer<typeof purchaseOrderDraftSchema>;

// --- Delivery records --------------------------------------------------

/** One line of a delivery — quantities against a specific Purchase Order line. */
export const deliveryLineSchema = z
  .object({
    lineId: z.uuid(),
    qtyDelivered: nonNegQty,
    qtyAccepted: nonNegQty,
    qtyRejected: nonNegQty,
  })
  .refine((l) => l.qtyAccepted + l.qtyRejected <= l.qtyDelivered + 1e-9, {
    error: "Accepted + rejected cannot exceed the delivered quantity.",
    path: ["qtyAccepted"],
  });

export type DeliveryLineInput = z.infer<typeof deliveryLineSchema>;

export const deliveryLinesSchema = z
  .array(deliveryLineSchema)
  .min(1, { error: "Record a quantity against at least one line." })
  .max(200)
  .refine((rows) => rows.some((l) => l.qtyDelivered > 0), {
    error: "Enter a delivered quantity on at least one line.",
  });

export const deliverySchema = z.object({
  deliveredOn: isoDate,
  noteNumber: optText(120),
  siteNotes: optText(1000),
  overDeliveryReason: optText(500),
  lines: deliveryLinesSchema,
});

export type DeliveryInput = z.infer<typeof deliverySchema>;

// --- Supplier payments ------------------------------------------------

export const paymentSchema = z.object({
  paidOn: isoDate,
  amount: wholeAmount,
  method: z.enum(["bank_transfer", "cash", "mobile_money", "cheque", "other"]),
  kind: z.preprocess(
    emptyToUndefined,
    z.enum(["deposit", "partial", "final"]).optional(),
  ),
  reference: optText(120),
  overPaymentReason: optText(500),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// --- Small shared shapes --------------------------------------------

/** Voiding a delivery or a payment — a recorded reason is required (ticket 09 §3). */
export const voidReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, { error: "Give a reason." })
    .max(500, { error: "Keep the reason short." }),
});

export type VoidReasonInput = z.infer<typeof voidReasonSchema>;

/** Cancelling an issued Purchase Order (a real change is cancel-and-reissue, ADR 0003). */
export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, { error: "Say why this order is being cancelled." })
    .max(500, { error: "Keep the reason short." }),
});

export type CancelInput = z.infer<typeof cancelSchema>;

/** Recording a supplier's acknowledgement of the order — a dated note, not a gate. */
export const supplierAckSchema = z.object({
  supplierAckNote: z
    .string()
    .trim()
    .min(2, { error: "Enter what the supplier confirmed." })
    .max(1000, { error: "Keep the note short." }),
  supplierAckOn: optDate,
});

export type SupplierAckInput = z.infer<typeof supplierAckSchema>;
