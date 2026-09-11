import { z } from "zod";

import { phoneSchema } from "@/lib/auth/password-schema";

/**
 * Input validation for the Account profile edit (Slice 2.8 Part 2) — full
 * name and phone only. Isomorphic (no `server-only`): the Server Action
 * parses `FormData` with this, and it doubles as the form's field contract.
 *
 * `phone` reuses signup's own `phoneSchema` verbatim so the two can't drift —
 * the ticket already validated this number "for plausible format only,
 * never used for auth" at signup, and this is the same field. `fullName`
 * mirrors signup's `fullName` rule (`@/lib/auth/password-schema`'s
 * `signupSchema`) for the same reason. Email is deliberately absent — it is
 * read-only here; changing it needs an out-of-scope verification-link flow.
 */
export const accountProfileInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Enter your full name." })
    .max(120, { error: "That name looks too long." }),
  phone: phoneSchema,
});

export type AccountProfileInput = z.infer<typeof accountProfileInputSchema>;
