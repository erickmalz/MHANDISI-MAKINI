import type { ReactNode } from "react";

import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("auth.verifyEmail.pageTitle");

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
