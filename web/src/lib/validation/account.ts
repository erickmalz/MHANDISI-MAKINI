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

/**
 * Self-serve account deletion request (Slice 2.8 Part 4 / ticket 02):
 * "re-enter the password and type a confirmation phrase". The confirmation
 * phrase is the Account's own sign-in email — a default this brief sets (the
 * ticket names the requirement, not the exact phrase): typing back the email
 * that is about to lose everything is self-documenting in the UI and, unlike
 * an arbitrary literal like "DELETE", can't be satisfied by habit or
 * autofill. The Server Action checks it case-insensitively against the real
 * session email — this schema only checks shape, same division as the
 * profile schema above.
 */
export const accountDeletionInputSchema = z.object({
  password: z.string().min(1, { error: "Enter your password." }),
  confirmEmail: z
    .string()
    .trim()
    .min(1, { error: "Type your email address to confirm." }),
});

export type AccountDeletionInput = z.infer<typeof accountDeletionInputSchema>;
