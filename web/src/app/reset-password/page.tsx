import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reset your password — Mhandisi Makini",
};

/**
 * Phase 4 builds the full reset flow (request form + set-new-password landing,
 * single-use 1-hour link, revoke other sessions, mark email verified — ticket
 * 02). This placeholder keeps the sign-in link honest until then.
 */
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-card px-4 py-16 text-center sm:px-6">
      <div className="w-full max-w-md">
        <Image
          src="/brand/logo-stacked.png"
          alt="Mhandisi Makini"
          width={905}
          height={1000}
          priority
          className="mx-auto h-auto w-[140px]"
        />
        <h1 className="mt-6 text-[1.75rem] font-bold text-foreground">
          Password reset isn&apos;t available yet
        </h1>
        <p className="mt-2 text-muted-foreground">
          This preview doesn&apos;t have the reset flow wired up. If you&apos;re
          locked out, email{" "}
          <a
            className="font-bold text-foreground underline"
            href="mailto:support@mhandisimakini.app"
          >
            support@mhandisimakini.app
          </a>
          .
        </p>
        <p className="mt-6 text-sm">
          <Link href="/sign-in" className="font-bold text-foreground underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
