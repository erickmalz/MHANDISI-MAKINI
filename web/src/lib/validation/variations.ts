import { z } from "zod";

/**
 * Input validation for the Variation write DAL (Phase 3 Slice 3.1). Isomorphic
 * (no `server-only`): the Server Action parses `FormData` with these and the
 * schemas double as the field contract the forms follow.
 *
 * Enum literals here must match the `variation_status` `pgEnum` values exactly.
 */

const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
    .optional(),
);

/**
 * An optional **signed** whole-shilling amount — a Variation's impact can
 * reduce as well as add (ticket 01 §3), unlike a plain take-off/labour amount.
 */
const optSignedWholeAmount = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter an amount." })
    .int({ error: "Enter a whole number of shillings." })
    .optional(),
);

const requiredUuid = z.preprocess(
  emptyToUndefined,
  z.uuid({ error: "Choose the task this Variation is against." }),
);

/** The editable body of a Draft Variation. */
export const variationDraftSchema = z.object({
  taskId: requiredUuid,
  description: z
    .string()
    .trim()
    .min(2, { error: "Describe the scope change." })
    .max(300, { error: "Keep the description short." }),
  reason: optText(500),
  materialImpact: optSignedWholeAmount,
  labourImpact: optSignedWholeAmount,
  feeImpact: optSignedWholeAmount,
  notes: optText(2000),
});

export type VariationDraftInput = z.infer<typeof variationDraftSchema>;

/**
 * Approving a Variation (ticket 01 §6) — `approvedAt`/`clientReference` are the
 * Engineer's own record of the client's real-world sign-off. Neither is
 * required to gate the Approve action; a blank Approval date defaults to
 * today in the DAL.
 */
export const approveVariationSchema = z.object({
  approvedAt: optDate,
  clientReference: optText(160),
});

export type ApproveVariationInput = z.infer<typeof approveVariationSchema>;
