import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// better-auth owns every /api/auth/* route (sign-in, sign-up, sign-out,
// verify-email, reset-password, session, list/revoke sessions). The handler is
// resolved per request so `next build` doesn't need the runtime secret.
export const GET = (request: Request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) =>
  toNextJsHandler(getAuth()).POST(request);
