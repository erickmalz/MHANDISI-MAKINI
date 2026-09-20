import type { ReactNode } from "react";

import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("auth.signUp.pageTitle");

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
