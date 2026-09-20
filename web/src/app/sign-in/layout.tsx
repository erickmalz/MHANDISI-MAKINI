import type { ReactNode } from "react";

import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("auth.signIn.pageTitle");

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
