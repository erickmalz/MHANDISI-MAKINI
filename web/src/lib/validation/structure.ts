import { z } from "zod";

/**
 * Input validation for the structure write DAL (Slice 2.4) — Projects and
 * Stages. Isomorphic (no `server-only`): the Server Action parses `FormData`
 * with these, and the schemas double as the field contract the forms follow.
 *
 * Enum literals here must match the Drizzle `pgEnum` values exactly
 * (`src/lib/data/schema/{projects,stages}.ts`).
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/** An optional free-text field: "" from an untouched input becomes `undefined`. */
const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

/** An optional ISO calendar date (`<input type="date">` gives `YYYY-MM-DD`). */
const optDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
    .optional(),
);

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

/** An optional whole-shilling amount (TZS has no minor unit in this app). */
const optAmount = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Enter an amount." })
    .int({ error: "Enter a whole number of shillings." })
    .nonnegative({ error: "An amount cannot be negative." })
    .optional(),
);

export const projectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter the project name." })
    .max(160, { error: "That name is too long." }),
  clientName: z
    .string()
    .trim()
    .min(2, { error: "Enter the client's name." })
    .max(160, { error: "That name is too long." }),
  clientPhone: optPhone,
  clientEmail: optEmail,
  site: z
    .string()
    .trim()
    .min(2, { error: "Enter the project site." })
    .max(200, { error: "That site description is too long." }),
  estimateModel: z.enum(["budget", "fixed_price"]).default("budget"),
  status: z
    .enum(["active", "on_hold", "completed", "archived"])
    .default("active"),
  startedOn: optDate,
  expectedCompletionOn: optDate,
  notes: optText(2000),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const stageInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Enter the stage name." })
      .max(120, { error: "That name is too long." }),
    feeBasis: z.preprocess(
      emptyToUndefined,
      z.enum(["fixed", "percent"]).optional(),
    ),
    feeAmount: optAmount,
    feePercent: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "Enter a percentage." })
        .min(0, { error: "A percentage cannot be negative." })
        .max(100, { error: "A percentage cannot exceed 100." })
        .optional(),
    ),
    status: z
      .enum([
        "planned",
        "active",
        "awaiting_funding",
        "on_hold",
        "ready_for_closeout",
        "completed",
        "cancelled",
      ])
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
  })
  .superRefine((val, ctx) => {
    if (val.feeBasis === "fixed" && val.feeAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["feeAmount"],
        message: "Enter the fixed fee amount.",
      });
    }
    if (val.feeBasis === "percent" && val.feePercent === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["feePercent"],
        message: "Enter the fee percentage.",
      });
    }
  });

export type StageInput = z.infer<typeof stageInputSchema>;
