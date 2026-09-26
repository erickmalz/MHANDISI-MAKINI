import type { ReactNode } from "react";

import { AppChrome } from "@/components/AppChrome";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { requireUsableSession } from "@/lib/auth/session";

/**
 * The authenticated route group. `requireUsableSession()` is the authoritative
 * check (proxy.ts is only optimistic): it redirects to /sign-in without a
 * session, and reports whether the 7-day email gate has hardened.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, emailGateActive } = await requireUsableSession();

  if (emailGateActive) {
    return <EmailVerificationGate email={user.email} />;
  }

  return (
    <div className="lg:flex lg:min-h-full">
      <AppChrome userEmail={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        {children}
      </div>
    </div>
  );
}
