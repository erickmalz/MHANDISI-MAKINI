import { z } from "zod";

/**
 * Input validation for the Stage Template register (Operational Control
 * decision 2, Slice 6). Isomorphic (no `server-only`): the Server Action
 * parses `FormData` with these and the schemas double as the field contract
 * the forms follow.
 *
 * The stage/task/material-line tree is managed client-side and posted as one
 * JSON string in a hidden `stages` field, same pattern as
 * `validation/funding.ts`'s `lines` field — `templateStagesSchema` parses
 * that payload. A template stores **names and units only**, so there is no
 * numeric-amount handling here at all.
 */

const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

export const templateMaterialLineSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1, { error: "Name this material." })
    .max(160, { error: "That name is too long." }),
  unit: z
    .string()
    .trim()
    .min(1, { error: "Enter a unit (bag, ton, piece…)." })
    .max(24, { error: "That unit label is too long." }),
});

export const templateTaskSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, { error: "Name this task." })
    .max(160, { error: "That name is too long." }),
  materialLines: z
    .array(templateMaterialLineSchema)
    .max(100, { error: "That is more materials than one task can carry." }),
});

export const templateStageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name this stage." })
    .max(160, { error: "That name is too long." }),
  tasks: z
    .array(templateTaskSchema)
    .max(100, { error: "That is more tasks than one stage can carry." }),
});

export const templateStagesSchema = z
  .array(templateStageSchema)
  .min(1, { error: "Add at least one stage." })
  .max(50, { error: "That is more stages than one template can carry." });

export const stageTemplateInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(2, { error: "Name the template." })
      .max(160, { error: "That name is too long." }),
  ),
  stages: templateStagesSchema,
});

export type TemplateMaterialLineInput = z.infer<typeof templateMaterialLineSchema>;
export type TemplateTaskInput = z.infer<typeof templateTaskSchema>;
export type TemplateStageInput = z.infer<typeof templateStageSchema>;
export type StageTemplateInput = z.infer<typeof stageTemplateInputSchema>;

/** "Save as template" — just a name; the tree is assembled server-side from the project. */
export const saveAsTemplateInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(2, { error: "Name the template." })
      .max(160, { error: "That name is too long." }),
  ),
});

export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateInputSchema>;
