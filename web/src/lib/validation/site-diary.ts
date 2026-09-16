import { z } from "zod";

/**
 * Input validation for Site Diary entries (Phase 4 Slice 4.1, ticket 01).
 * Isomorphic (no `server-only`). Nothing is mandatory beyond the entry
 * date — a supervisor filling this in from a phone at day's end can leave
 * any narrative section blank (ticket 01's Answer).
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/** An optional free-text field: "" from an untouched input becomes `undefined`. */
const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const siteDiaryEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." }),
  weather: optText(120),
  workersOnSite: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Enter a whole number." })
      .int({ error: "Enter a whole number." })
      .nonnegative({ error: "Workers on site cannot be negative." })
      .optional(),
  ),
  activities: optText(4000),
  materialsUsed: optText(4000),
  equipmentUsed: optText(2000),
  delays: optText(2000),
  issues: optText(2000),
  instructions: optText(2000),
  visitors: optText(2000),
  notes: optText(4000),
});

export type SiteDiaryEntryInput = z.infer<typeof siteDiaryEntrySchema>;
