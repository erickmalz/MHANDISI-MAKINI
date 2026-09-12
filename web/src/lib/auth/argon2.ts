import "server-only";

import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

/**
 * OWASP argon2id parameters (m=19 MiB, t=2, p=1), shared by better-auth's
 * password hooks (`./index.ts`) and the re-authentication check for
 * self-serve account deletion (`./verify-password.ts`). Extracted so both
 * call sites hash/verify identically rather than risk two configs drifting.
 */
const ARGON2_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_OPTS);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2Verify(hash, password, ARGON2_OPTS);
}
