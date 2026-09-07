import { z } from "zod";

import { isBreachedPassword } from "./breached-passwords";

/**
 * Password rules from ticket 02: minimum 10 characters, no composition rules,
 * rejected if it appears in the common/breached list. Run in front of
 * better-auth's signup and reset — better-auth only enforces a bare length.
 */
export const passwordSchema = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(128, { error: "Use at most 128 characters." })
  .refine((value) => !isBreachedPassword(value), {
    error: "That password is too common. Choose something less predictable.",
  });

/** Kenyan / Tanzanian mobile numbers and the usual international forms. */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, { error: "Enter a phone number." })
  .max(20, { error: "That phone number looks too long." })
  .regex(/^[+()\d][\d\s()-]{5,}$/, {
    error: "Enter a valid phone number.",
  });

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Enter your full name." })
    .max(120, { error: "That name looks too long." }),
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  phone: phoneSchema,
  password: passwordSchema,
  acceptedTerms: z.literal(true, {
    error: "You must accept the Terms and Privacy Policy to continue.",
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
