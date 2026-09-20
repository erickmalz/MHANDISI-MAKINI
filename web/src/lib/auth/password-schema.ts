import { z } from "zod";

import { isBreachedPassword } from "./breached-passwords";

/**
 * The `error` values below are catalogue keys (`auth.validation.*`), not
 * English sentences: `Field` translates them for whichever language is
 * selected. Do the same for any new schema message.
 *
 * Password rules from ticket 02: minimum 10 characters, no composition rules,
 * rejected if it appears in the common/breached list. Run in front of
 * better-auth's signup and reset — better-auth only enforces a bare length.
 */
export const passwordSchema = z
  .string()
  .min(10, { error: "auth.validation.passwordTooShort" })
  .max(128, { error: "auth.validation.passwordTooLong" })
  .refine((value) => !isBreachedPassword(value), {
    error: "auth.validation.passwordCommon",
  });

/** Kenyan / Tanzanian mobile numbers and the usual international forms. */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, { error: "auth.validation.phoneRequired" })
  .max(20, { error: "auth.validation.phoneTooLong" })
  .regex(/^[+()\d][\d\s()-]{5,}$/, {
    error: "auth.validation.phoneInvalid",
  });

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "auth.validation.nameRequired" })
    .max(120, { error: "auth.validation.nameTooLong" }),
  email: z.email({ error: "auth.validation.emailInvalid" }).trim().toLowerCase(),
  phone: phoneSchema,
  password: passwordSchema,
  acceptedTerms: z.literal(true, {
    error: "auth.validation.termsRequired",
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
