import { z } from "zod";

import { PHOTO_CATEGORIES } from "@/lib/photos";

/**
 * Input validation for the Photo upload form's non-file fields (Phase 4
 * Slice 4.1, ticket 02). Isomorphic (no `server-only`). The file itself is
 * validated in the Server Action (`FormData` gives a `File`, not something
 * Zod parses directly) — same split as `actions/attachments.ts`.
 */

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const photoMetaSchema = z.object({
  category: z.enum(PHOTO_CATEGORIES, { error: "Choose a category." }),
  caption: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(300, { error: "That caption is too long." }).optional(),
  ),
  gpsLat: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Enter a valid latitude." })
      .min(-90, { error: "Latitude must be between -90 and 90." })
      .max(90, { error: "Latitude must be between -90 and 90." })
      .optional(),
  ),
  gpsLng: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Enter a valid longitude." })
      .min(-180, { error: "Longitude must be between -180 and 180." })
      .max(180, { error: "Longitude must be between -180 and 180." })
      .optional(),
  ),
  capturedOn: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
      .optional(),
  ),
});

export type PhotoMetaInput = z.infer<typeof photoMetaSchema>;
