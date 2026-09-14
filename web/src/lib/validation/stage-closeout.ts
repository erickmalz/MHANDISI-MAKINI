import { z } from "zod";

/**
 * Input validation for Stage Closeout (Phase 3 ticket 05). Isomorphic (no
 * `server-only`).
 *
 * The surplus lines are managed client-side and posted as one JSON string in
 * a hidden `lines` field, mirroring `takeOffLinesSchema`
 * (`src/lib/validation/tasks.ts`) — each line names an on-site material and
 * how the Engineer resolves it: Carried Forward (ticket 06's stock ledger) or
 * Written Off (ticket 06 §5's decrement-if-already-on-hand rule).
 */

export const surplusLineSchema = z.object({
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
  qty: z.coerce
    .number({ error: "Enter a quantity." })
    .positive({ error: "Enter a quantity greater than zero." }),
  resolution: z.enum(["carry_forward", "written_off"], {
    error: "Choose Carried Forward or Written Off.",
  }),
});

export type SurplusLineInput = z.infer<typeof surplusLineSchema>;

export const surplusLinesSchema = z
  .array(surplusLineSchema)
  .max(100, { error: "That is more lines than a single closeout can carry." });
