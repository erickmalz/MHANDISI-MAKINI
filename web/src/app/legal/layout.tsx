import type { ReactNode } from "react";
import Link from "next/link";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm font-bold text-foreground underline">
        Mhandisi Makini
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}
