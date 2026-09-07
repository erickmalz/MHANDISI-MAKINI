import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// better-auth owns every /api/auth/* route (sign-in, sign-up, sign-out,
// verify-email, reset-password, session, list/revoke sessions).
export const { GET, POST } = toNextJsHandler(auth);
