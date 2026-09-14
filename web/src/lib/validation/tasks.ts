import { z } from "zod";

/**
 * Input validation for the Task + Material Take-Off write DAL (Slice 2.4b).
 * Isomorphic (no `server-only`): the Server Action parses `FormData` with these
 * and the schemas double as the field contract the form follows.
 *
 * The take-off rows are managed client-side and posted as one JSON string in a
 * hidden `lines` field — `takeOffLinesSchema` parses that payload.
 *
 * Enum literals here must match the `task_status` `pgEnum` values exactly.
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
    .optional(),
);

/** An optional whole-shilling amount (TZS has no minor unit in this app). */
const optWholeAmount = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter an amount." })
    .int({ error: "Enter a whole number of shillings." })
    .nonnegative({ error: "An amount cannot be negative." })
    .optional(),
);

const optQty = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter a quantity." })
    .positive({ error: "Enter a quantity greater than zero." })
    .optional(),
);

const optUuid = z.preprocess(
  emptyToUndefined,
  z.uuid({ error: "Choose a subcontractor from the register." }).optional(),
);

/**
 * A take-off line's own id, present only when the form is editing a line
 * that already exists in the database (Phase 3 ticket 03 §2). Absent on a
 * brand-new line — the DAL's per-line diff treats a missing id as "insert."
 */
const optLineId = z.preprocess(emptyToUndefined, z.uuid().optional());

/**
 * A bounded, optional "Apply from stock" quantity (Phase 3 ticket 06 §4) — how
 * much of this line's requirement is drawn from the project's existing
 * Material Stock instead of being procured fresh. `0`/absent means none
 * applied. The DAL re-caps this at the live on-hand balance regardless of
 * what the form already bounded client-side.
 */
const optApplyFromStock = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter a quantity." })
    .nonnegative({ error: "This cannot be negative." })
    .optional(),
);

/** One Material Take-Off line, as the form posts it (guidelines §16). */
export const takeOffLineSchema = z.object({
  id: optLineId,
  item: z
    .string()
    .trim()
    .min(2, { error: "Name this material line." })
    .max(160, { error: "That description is too long." }),
  description: optText(300),
  qty: optQty,
  unit: z
    .string()
    .trim()
    .min(1, { error: "Enter a unit (bag, ton, piece…)." })
    .max(24, { error: "That unit label is too long." }),
  estUnitCost: optWholeAmount,
  applyFromStock: optApplyFromStock,
});

export type TakeOffLineInput = z.infer<typeof takeOffLineSchema>;

export const takeOffLinesSchema = z
  .array(takeOffLineSchema)
  .max(200, { error: "That is more lines than a single take-off can carry." });

export const taskInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, { error: "Describe the task." })
    .max(300, { error: "Keep the task description short." }),
  subcontractorId: optUuid,
  labourAmount: optWholeAmount,
  status: z
    .enum(["planned", "active", "on_hold", "completed", "cancelled"])
    .default("planned"),
  progressPercent: z.coerce
    .number({ error: "Enter a percentage." })
    .int({ error: "Enter a whole number." })
    .min(0, { error: "Progress cannot be negative." })
    .max(100, { error: "Progress cannot exceed 100." })
    .default(0),
  startedOn: optDate,
  completedOn: optDate,
  notes: optText(2000),
  lines: takeOffLinesSchema.default([]),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
