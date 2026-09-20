import type { ReactNode } from "react";

import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("tasks.edit.pageTitle");

export default function EditTaskLayout({ children }: { children: ReactNode }) {
  return children;
}
